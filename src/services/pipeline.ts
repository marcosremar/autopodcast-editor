import { db, projects, segments as segmentsTable, type Project, type NewSegment, type SegmentAnalysis } from "@/lib/db";
import { eq } from "drizzle-orm";

// Service interfaces for dependency injection
export interface TranscriptionService {
  transcribe(audioUrl: string): Promise<TranscriptionResult>;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
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
  constructor(
    private transcription: TranscriptionService,
    private analysis: AnalysisService,
    private reorder: ReorderService,
    private storage: StorageService,
    private database = db
  ) {}

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

      // Step 2: Chunk into segments (30-60s)
      const chunkedSegments = this.chunkSegments(
        transcriptionResult.segments,
        30,
        60
      );

      // Step 3: Analyze segments
      await this.updateStatus(projectId, "analyzing");
      const analyzedSegments = await this.analyzeSegments(
        chunkedSegments,
        transcriptionResult.text
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
        currentChunk = { ...segment };
        continue;
      }

      const currentDuration = currentChunk.end - currentChunk.start;
      const segmentDuration = segment.end - segment.start;

      // If adding this segment would exceed max duration, save current chunk
      if (currentDuration + segmentDuration > maxDuration) {
        // Only save if it meets minimum duration
        if (currentDuration >= minDuration) {
          chunks.push(currentChunk);
          currentChunk = { ...segment };
        } else {
          // Extend current chunk even if it exceeds max slightly
          currentChunk.end = segment.end;
          currentChunk.text += " " + segment.text;
        }
      } else {
        // Merge segments
        currentChunk.end = segment.end;
        currentChunk.text += " " + segment.text;
      }
    }

    // Add final chunk if it exists
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Analyze all segments with Claude
   */
  private async analyzeSegments(
    segments: TranscriptSegment[],
    fullContext: string
  ): Promise<SegmentWithAnalysis[]> {
    const analyzed: SegmentWithAnalysis[] = [];

    for (const segment of segments) {
      try {
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
        });
      }
    }

    return analyzed;
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
