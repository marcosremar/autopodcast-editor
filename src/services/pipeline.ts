import { db, projects, segments as segmentsTable, type Project, type NewSegment, type SegmentAnalysis } from "@/lib/db";
import { eq } from "drizzle-orm";
import { ForcedAlignerService, getForcedAlignerService } from "@/lib/audio/forced-aligner";
import { diarize, alignWithTranscript, getSpeakerDisplayNames, type DiarizationResult, type DiarizationSegment } from "@/services/pyannote";
import { detectTopics, type TopicSegment } from "@/services/topic-segmentation";
import { processProjectFillers } from "@/lib/audio/filler-detection";

// Service interfaces for dependency injection
export interface TranscriptionService {
  transcribe(audioUrl: string): Promise<TranscriptionResult>;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  words?: WordTimestamp[];
}

export interface AnalysisService {
  analyzeSegment(text: string, context: string): Promise<SegmentAnalysis>;
}

export interface ReorderService {
  suggestOrder(segments: SegmentWithAnalysis[]): Promise<OrderSuggestion[]>;
}

export interface SegmentWithAnalysis {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  analysis: SegmentAnalysis;
  wordTimestamps?: WordTimestamp[];
  speaker?: string;
  speakerLabel?: string;
  topicId?: number;
}

export interface OrderSuggestion {
  segmentId: string;
  suggestedOrder: number;
  reason: string;
}

export interface StorageService {
  uploadFile(file: Buffer, key: string, contentType: string): Promise<string>;
  deleteFile(key: string): Promise<void>;
  getFileUrl(key: string): Promise<string>;
}

// Main processing pipeline
export class PodcastPipeline {
  private forcedAligner: ForcedAlignerService;

  constructor(
    private transcription: TranscriptionService,
    private analysis: AnalysisService,
    private reorder: ReorderService,
    private storage: StorageService,
    private database = db,
    forcedAligner?: ForcedAlignerService
  ) {
    this.forcedAligner = forcedAligner || getForcedAlignerService();
  }

  /**
   * Process a podcast project through the entire pipeline
   */
  async process(projectId: string): Promise<void> {
    try {
      // Get project details
      const project = await this.getProject(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      if (!project.originalAudioUrl) {
        throw new Error(`Project ${projectId} has no audio URL`);
      }

      // Step 1: Transcribe audio
      await this.updateStatus(projectId, "transcribing");
      const transcriptionResult = await this.transcription.transcribe(
        project.originalAudioUrl
      );

      // Store full transcription
      await this.updateProject(projectId, {
        transcription: transcriptionResult.text,
      });

      // Step 1.5: Refine word timestamps with Forced Aligner
      // This provides ~20ms precision vs ~100-200ms from Whisper
      await this.updateStatus(projectId, "aligning");
      const alignedSegments = await this.refineWordTimestamps(
        project.originalAudioUrl,
        transcriptionResult.segments
      );

      // Replace segments with aligned versions if successful
      if (alignedSegments.length > 0) {
        transcriptionResult.segments = alignedSegments;
        console.log(`[Pipeline] Word timestamps refined with Forced Aligner`);
      }

      // Step 1.6: Detect content type (optional, async)
      try {
        const { ContentDetectionService } = await import("@/lib/ai/ContentDetectionService");
        const contentDetection = new ContentDetectionService(this.database);
        await contentDetection.detectAndSave(
          projectId,
          transcriptionResult.text
        );
        console.log(`[Pipeline] Content type detected for project ${projectId}`);
      } catch (error) {
        console.warn(`[Pipeline] Content detection failed (non-critical):`, error);
        // Continue pipeline even if detection fails
      }

      // Step 1.7: Speaker Diarization (identify who is speaking)
      let diarizationResult: DiarizationResult | null = null;
      let speakerNames: Record<string, string> = {};
      try {
        await this.updateStatus(projectId, "diarizing");
        console.log(`[Pipeline] Starting speaker diarization...`);
        diarizationResult = await diarize(project.originalAudioUrl);

        if (diarizationResult.success && diarizationResult.speakers) {
          speakerNames = getSpeakerDisplayNames(diarizationResult.speakers);

          // Save diarization to project
          await this.updateProject(projectId, {
            diarization: diarizationResult as any,
            speakers: diarizationResult.speakers as any,
            speakerStats: diarizationResult.speaker_stats as any,
          });

          console.log(`[Pipeline] Diarization complete: ${diarizationResult.num_speakers} speakers`);
        }
      } catch (error) {
        console.warn(`[Pipeline] Diarization failed (non-critical):`, error);
        // Continue pipeline even if diarization fails
      }

      // Step 1.8: Topic Detection (identify chapters/themes)
      let detectedTopics: TopicSegment[] = [];
      let topicsSummary: string | undefined;
      try {
        await this.updateStatus(projectId, "detecting_topics");
        console.log(`[Pipeline] Detecting topics...`);

        // Prepare segments for topic detection
        const segmentsForTopics = transcriptionResult.segments.map((s, i) => ({
          id: i,
          start: s.start,
          end: s.end,
          text: s.text,
        }));

        // Use OpenRouter with Gemini for topic detection
        const topicResult = await detectTopics(segmentsForTopics, {
          language: project.language || 'pt',
        });

        if (topicResult.success) {
          detectedTopics = topicResult.topics;
          topicsSummary = topicResult.summary;

          // Save topics to project
          await this.updateProject(projectId, {
            topics: detectedTopics as any,
            topicsSummary: topicsSummary,
          });

          console.log(`[Pipeline] Detected ${detectedTopics.length} topics`);
        }
      } catch (error) {
        console.warn(`[Pipeline] Topic detection failed (non-critical):`, error);
        // Continue pipeline even if topic detection fails
      }

      // Step 2: Chunk into segments (30-60s)
      const chunkedSegments = this.chunkSegments(
        transcriptionResult.segments,
        30,
        60
      );

      // Step 3: Analyze segments (with diarization and topics)
      await this.updateStatus(projectId, "analyzing");
      const analyzedSegments = await this.analyzeSegments(
        chunkedSegments,
        transcriptionResult.text,
        diarizationResult?.segments || [],
        speakerNames,
        detectedTopics
      );

      // Step 4: Select best segments based on target duration
      const selectedSegments = this.selectBestSegments(
        analyzedSegments,
        project.targetDuration || project.originalDuration || 0
      );

      // Step 5: Suggest narrative order
      await this.updateStatus(projectId, "reordering");
      const orderSuggestions = await this.reorder.suggestOrder(selectedSegments);

      // Step 6: Save segments to database
      await this.saveSegments(projectId, selectedSegments, orderSuggestions);

      // Step 6.5: Detect filler words (ums, ahs, tipo, né)
      try {
        await this.updateStatus(projectId, "detecting_fillers");
        console.log(`[Pipeline] Detecting filler words...`);

        const language = (project.language === "en" ? "en" : "pt") as "pt" | "en";
        const fillerResult = await processProjectFillers(projectId, language);

        console.log(`[Pipeline] Detected ${fillerResult.stats.totalCount} filler words`);
      } catch (error) {
        console.warn(`[Pipeline] Filler detection failed (non-critical):`, error);
        // Continue pipeline even if filler detection fails
      }

      // Step 7: Mark as ready
      await this.updateStatus(projectId, "ready");
    } catch (error) {
      console.error(`Pipeline error for project ${projectId}:`, error);
      await this.updateStatus(projectId, "error");
      throw error;
    }
  }

  /**
   * Chunk transcript segments into 30-60 second segments
   */
  private chunkSegments(
    segments: TranscriptSegment[],
    minDuration: number,
    maxDuration: number
  ): TranscriptSegment[] {
    const chunks: TranscriptSegment[] = [];
    let currentChunk: TranscriptSegment | null = null;

    for (const segment of segments) {
      if (!currentChunk) {
        currentChunk = { ...segment, words: segment.words ? [...segment.words] : undefined };
        continue;
      }

      const currentDuration = currentChunk.end - currentChunk.start;
      const segmentDuration = segment.end - segment.start;

      // If adding this segment would exceed max duration, save current chunk
      if (currentDuration + segmentDuration > maxDuration) {
        // Only save if it meets minimum duration
        if (currentDuration >= minDuration) {
          chunks.push(currentChunk);
          currentChunk = { ...segment, words: segment.words ? [...segment.words] : undefined };
        } else {
          // Extend current chunk even if it exceeds max slightly
          currentChunk.end = segment.end;
          currentChunk.text += " " + segment.text;
          // Merge word timestamps
          if (segment.words) {
            currentChunk.words = [...(currentChunk.words || []), ...segment.words];
          }
        }
      } else {
        // Merge segments
        currentChunk.end = segment.end;
        currentChunk.text += " " + segment.text;
        // Merge word timestamps
        if (segment.words) {
          currentChunk.words = [...(currentChunk.words || []), ...segment.words];
        }
      }
    }

    // Add final chunk if it exists
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Analyze all segments with Claude, including speaker and topic information
   */
  private async analyzeSegments(
    segments: TranscriptSegment[],
    fullContext: string,
    diarizationSegments: DiarizationSegment[] = [],
    speakerNames: Record<string, string> = {},
    topics: TopicSegment[] = []
  ): Promise<SegmentWithAnalysis[]> {
    const analyzed: SegmentWithAnalysis[] = [];

    for (const segment of segments) {
      try {
        // Find speaker for this segment using diarization
        const segmentMid = (segment.start + segment.end) / 2;
        let speaker: string | undefined;
        let speakerLabel: string | undefined;

        for (const diarSeg of diarizationSegments) {
          if (diarSeg.start <= segmentMid && segmentMid <= diarSeg.end) {
            speaker = diarSeg.speaker;
            speakerLabel = speakerNames[diarSeg.speaker];
            break;
          }
        }

        // Find topic for this segment
        let topicId: number | undefined;
        for (const topic of topics) {
          if (segment.start >= topic.start && segment.start < topic.end) {
            topicId = topic.id;
            break;
          }
        }
        const analysis = await this.analysis.analyzeSegment(
          segment.text,
          fullContext
        );

        analyzed.push({
          id: "", // Will be assigned by database
          startTime: segment.start,
          endTime: segment.end,
          text: segment.text,
          analysis,
          wordTimestamps: segment.words,
          speaker,
          speakerLabel,
          topicId,
        });
      } catch (error) {
        console.error("Error analyzing segment:", error);
        // Continue with other segments even if one fails
        analyzed.push({
          id: "",
          startTime: segment.start,
          endTime: segment.end,
          text: segment.text,
          analysis: this.getDefaultAnalysis(),
          wordTimestamps: segment.words,
          speaker: undefined,
          speakerLabel: undefined,
          topicId: undefined,
        });
      }
    }

    return analyzed;
  }

  /**
   * Refine word timestamps using Forced Aligner
   * Provides ~20ms precision vs ~100-200ms from Whisper
   */
  private async refineWordTimestamps(
    audioUrl: string,
    segments: TranscriptSegment[]
  ): Promise<TranscriptSegment[]> {
    try {
      console.log(`[Pipeline] Refining word timestamps for ${segments.length} segments`);

      // Prepare segments for alignment
      const segmentsForAlignment = segments.map((s) => ({
        start: s.start,
        end: s.end,
        text: s.text,
      }));

      // Call the Forced Aligner service
      const result = await this.forcedAligner.alignSegments(
        audioUrl,
        segmentsForAlignment,
        "por" // Portuguese by default
      );

      if (!result.success) {
        console.warn(`[Pipeline] Forced alignment failed: ${result.error}`);
        console.warn(`[Pipeline] Falling back to Whisper word timestamps`);
        return segments; // Return original segments
      }

      // Map aligned results back to TranscriptSegment format
      const alignedSegments: TranscriptSegment[] = result.segments.map((aligned, index) => {
        const original = segments[index];

        // Convert word_timestamps to words format
        const words: WordTimestamp[] = aligned.word_timestamps.map((wt) => ({
          word: wt.word,
          start: wt.start,
          end: wt.end,
        }));

        // If alignment failed for this segment, fall back to original
        if (aligned.alignment_error || words.length === 0) {
          console.warn(`[Pipeline] Segment ${index} alignment failed, using Whisper timestamps`);
          return original;
        }

        return {
          start: original.start,
          end: original.end,
          text: original.text,
          words,
        };
      });

      // Count how many segments were successfully aligned
      const successCount = alignedSegments.filter((s, i) =>
        s.words && s.words.length > 0 && s.words !== segments[i].words
      ).length;

      console.log(`[Pipeline] Successfully aligned ${successCount}/${segments.length} segments`);

      return alignedSegments;
    } catch (error) {
      console.error(`[Pipeline] Error in refineWordTimestamps:`, error);
      console.warn(`[Pipeline] Falling back to Whisper word timestamps`);
      return segments; // Return original segments on error
    }
  }

  /**
   * Select best segments to meet target duration
   */
  private selectBestSegments(
    segments: SegmentWithAnalysis[],
    targetDuration: number
  ): SegmentWithAnalysis[] {
    // Score each segment based on interest, clarity, and absence of errors
    const scoredSegments = segments.map((segment) => ({
      segment,
      score: this.calculateSegmentScore(segment.analysis),
      duration: segment.endTime - segment.startTime,
    }));

    // Sort by score (descending)
    scoredSegments.sort((a, b) => b.score - a.score);

    // Select segments until we reach target duration
    const selected: SegmentWithAnalysis[] = [];
    let totalDuration = 0;

    for (const { segment, duration } of scoredSegments) {
      if (totalDuration >= targetDuration) {
        break;
      }

      selected.push(segment);
      totalDuration += duration;
    }

    return selected;
  }

  /**
   * Calculate a score for a segment based on its analysis
   */
  private calculateSegmentScore(analysis: SegmentAnalysis): number {
    let score = 0;

    // Add points for interest and clarity
    score += analysis.interestScore || 0;
    score += analysis.clarityScore || 0;

    // Deduct points for negative attributes
    if (analysis.isTangent) score -= 20;
    if (analysis.isRepetition) score -= 30;
    if (analysis.hasFactualError) score -= 50;
    if (analysis.hasContradiction) score -= 40;
    if (analysis.isConfusing) score -= 25;
    if (analysis.isIncomplete) score -= 15;

    // Bonus for standalone segments
    if (analysis.standalone) score += 10;

    return score;
  }

  /**
   * Save segments to database with suggested order
   */
  private async saveSegments(
    projectId: string,
    segments: SegmentWithAnalysis[],
    orderSuggestions: OrderSuggestion[]
  ): Promise<void> {
    // Create a map of segment index to suggested order
    const orderMap = new Map<number, OrderSuggestion>();
    orderSuggestions.forEach((suggestion, index) => {
      orderMap.set(index, suggestion);
    });

    // Insert all segments
    const segmentsToInsert: NewSegment[] = segments.map((segment, index) => {
      const orderSuggestion = orderMap.get(index);
      const analysis = segment.analysis;

      return {
        projectId,
        startTime: segment.startTime,
        endTime: segment.endTime,
        text: segment.text,
        interestScore: analysis.interestScore,
        clarityScore: analysis.clarityScore,
        topic: analysis.topic,
        keyInsight: analysis.keyInsight,
        isSelected: true, // All selected segments are marked as selected
        order: orderSuggestion?.suggestedOrder || index,
        analysis: analysis as any, // Store full analysis as JSON
        hasError: analysis.needsRerecord,
        errorType: analysis.needsRerecord ? "needs_rerecord" : null,
        errorDetail: analysis.rerecordSuggestion || null,
        wordTimestamps: segment.wordTimestamps as any, // Word-level timestamps for text-based editing
        speaker: segment.speaker || null,
        speakerLabel: segment.speakerLabel || null,
        topicId: segment.topicId || null,
      };
    });

    await this.database.insert(segmentsTable).values(segmentsToInsert);
  }

  /**
   * Get project from database
   */
  private async getProject(projectId: string): Promise<Project | null> {
    const results = await this.database
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    return results[0] || null;
  }

  /**
   * Update project status
   */
  private async updateStatus(
    projectId: string,
    status: string
  ): Promise<void> {
    await this.database
      .update(projects)
      .set({ status, updatedAt: new Date() })
      .where(eq(projects.id, projectId));
  }

  /**
   * Update project fields
   */
  private async updateProject(
    projectId: string,
    updates: Partial<Project>
  ): Promise<void> {
    await this.database
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, projectId));
  }

  /**
   * Get default analysis for failed segments
   */
  private getDefaultAnalysis(): SegmentAnalysis {
    return {
      topic: "Unknown",
      interestScore: 50,
      clarityScore: 50,
      isTangent: false,
      isRepetition: false,
      keyInsight: "Analysis failed",
      dependsOn: [],
      standalone: true,
      hasFactualError: false,
      hasContradiction: false,
      isConfusing: false,
      isIncomplete: false,
      needsRerecord: false,
    };
  }
}
