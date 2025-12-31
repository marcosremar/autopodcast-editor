/**
 * Servico de Analise de Segmentos
 * Usa AIService centralizado (Groq) para analisar segmentos de podcast
 */

import type { SegmentAnalysis } from "@/lib/db/schema";
import { getAIService, aiCompleteJSON } from "@/lib/ai/AIService";

export interface SegmentWithContext {
  text: string;
  startTime: number;
  endTime: number;
  previousSegments?: Array<{ text: string; topic?: string }>;
}

export interface BatchAnalysisOptions {
  useMock?: boolean;
}

export class AnalysisService {
  private useMock: boolean = false;

  constructor(options?: { useMock?: boolean }) {
    this.useMock = options?.useMock ?? false;
  }

  /**
   * Analyzes a single segment using AIService (Groq)
   */
  async analyzeSegment(segment: SegmentWithContext): Promise<SegmentAnalysis> {
    if (this.useMock) {
      return this.generateMockAnalysis(segment);
    }

    const prompt = this.buildAnalysisPrompt(segment);

    try {
      const result = await aiCompleteJSON<SegmentAnalysis>(
        "segment_analysis",
        prompt
      );
      return this.validateAndNormalizeAnalysis(result);
    } catch (error) {
      console.error("Error analyzing segment:", error);
      throw new Error(
        `Failed to analyze segment: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Analyzes multiple segments in batch
   * Includes context from previous segments for better coherence detection
   */
  async analyzeBatch(
    segments: SegmentWithContext[],
    options?: BatchAnalysisOptions
  ): Promise<SegmentAnalysis[]> {
    const useMock = options?.useMock ?? this.useMock;

    if (useMock) {
      return segments.map((seg) => this.generateMockAnalysis(seg));
    }

    const results: SegmentAnalysis[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      // Include previous 3 segments as context (if available)
      const previousSegments = segments
        .slice(Math.max(0, i - 3), i)
        .map((s) => ({
          text: s.text,
          topic: results[results.length - 1]?.topic,
        }));

      const segmentWithContext = {
        ...segment,
        previousSegments,
      };

      const analysis = await this.analyzeSegment(segmentWithContext);
      results.push(analysis);

      // Small delay to avoid rate limits
      if (i < segments.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Builds the analysis prompt
   */
  private buildAnalysisPrompt(segment: SegmentWithContext): string {
    const contextSection =
      segment.previousSegments && segment.previousSegments.length > 0
        ? `
## Previous Context
Here are the previous segments for context:
${segment.previousSegments
  .map(
    (prev, idx) => `
Segment ${idx + 1}:
Topic: ${prev.topic || "Unknown"}
Text: "${prev.text}"
`
  )
  .join("\n")}
`
        : "";

    return `You are analyzing a podcast transcript segment. Your task is to evaluate this segment across multiple dimensions to help determine whether it should be included in the final edited version.

${contextSection}

## Current Segment to Analyze
Duration: ${(segment.endTime - segment.startTime).toFixed(1)} seconds
Text: "${segment.text}"

## Analysis Instructions

Please analyze this segment and provide a JSON response with the following fields:

1. **topic** (string): A concise label for the main topic discussed (3-5 words)

2. **interestScore** (number 0-100): How interesting/engaging is this content?
   - Consider: novelty, storytelling, emotional resonance, entertainment value
   - 80-100: Highly engaging, memorable content
   - 60-79: Good content, worth keeping
   - 40-59: Average, borderline useful
   - 0-39: Low value, likely can be cut

3. **clarityScore** (number 0-100): How clear and well-communicated is this segment?
   - Consider: coherence, structure, easy to follow
   - 80-100: Crystal clear, well articulated
   - 60-79: Clear enough, minor issues
   - 40-59: Somewhat confusing or rambling
   - 0-39: Hard to understand or very poorly articulated

4. **isTangent** (boolean): Is this a tangent from the main discussion?

5. **isRepetition** (boolean): Does this repeat information already covered?
   - Use the previous context to detect repetition

6. **keyInsight** (string): The main point or insight from this segment (1-2 sentences)

7. **dependsOn** (array of strings): Topics that this segment depends on for context
   - If this segment references previous topics, list them
   - Empty array if standalone

8. **standalone** (boolean): Can this segment be understood without prior context?

9. **hasFactualError** (boolean): Does this contain obvious factual errors?

10. **factualErrorDetail** (string, optional): Description of the error if hasFactualError is true

11. **hasContradiction** (boolean): Does this contradict earlier statements?
    - Check against previous context

12. **contradictionDetail** (string, optional): Description of the contradiction

13. **isConfusing** (boolean): Is the communication confusing or unclear?

14. **confusingDetail** (string, optional): What makes it confusing

15. **isIncomplete** (boolean): Is the thought incomplete or cut off?

16. **incompleteDetail** (string, optional): What's missing

17. **needsRerecord** (boolean): Should this be re-recorded?
    - True if: hasFactualError, hasContradiction, isConfusing with clarityScore < 40

18. **rerecordSuggestion** (string, optional): Suggestion for how to re-record this

Return ONLY valid JSON, no other text. Example format:
{
  "topic": "Introduction to AI",
  "interestScore": 75,
  "clarityScore": 85,
  "isTangent": false,
  "isRepetition": false,
  "keyInsight": "AI is transforming how we work and live.",
  "dependsOn": [],
  "standalone": true,
  "hasFactualError": false,
  "hasContradiction": false,
  "isConfusing": false,
  "isIncomplete": false,
  "needsRerecord": false
}`;
  }

  /**
   * Validates and normalizes the analysis
   */
  private validateAndNormalizeAnalysis(
    analysis: Partial<SegmentAnalysis>
  ): SegmentAnalysis {
    return {
      topic: analysis.topic || "Unknown",
      interestScore: this.clamp(analysis.interestScore ?? 50, 0, 100),
      clarityScore: this.clamp(analysis.clarityScore ?? 50, 0, 100),
      isTangent: analysis.isTangent ?? false,
      isRepetition: analysis.isRepetition ?? false,
      keyInsight: analysis.keyInsight || "",
      dependsOn: analysis.dependsOn || [],
      standalone: analysis.standalone ?? true,
      hasFactualError: analysis.hasFactualError ?? false,
      factualErrorDetail: analysis.factualErrorDetail,
      hasContradiction: analysis.hasContradiction ?? false,
      contradictionDetail: analysis.contradictionDetail,
      isConfusing: analysis.isConfusing ?? false,
      confusingDetail: analysis.confusingDetail,
      isIncomplete: analysis.isIncomplete ?? false,
      incompleteDetail: analysis.incompleteDetail,
      needsRerecord: analysis.needsRerecord ?? false,
      rerecordSuggestion: analysis.rerecordSuggestion,
    };
  }

  /**
   * Generates mock analysis for testing
   */
  private generateMockAnalysis(segment: SegmentWithContext): SegmentAnalysis {
    const duration = segment.endTime - segment.startTime;
    const wordCount = segment.text.split(/\s+/).length;

    const hasQuestion = segment.text.includes("?");
    const hasUmAh = /\b(um|uh|ah|like)\b/i.test(segment.text);
    const isLong = duration > 30;

    let interestScore = 60;
    if (hasQuestion) interestScore += 10;
    if (isLong) interestScore -= 10;
    if (wordCount > 100) interestScore -= 5;

    let clarityScore = 80;
    if (hasUmAh) clarityScore -= 20;
    if (wordCount < 5) clarityScore -= 10;

    return {
      topic: this.extractMockTopic(segment.text),
      interestScore: this.clamp(interestScore, 0, 100),
      clarityScore: this.clamp(clarityScore, 0, 100),
      isTangent: Math.random() < 0.1,
      isRepetition: Math.random() < 0.05,
      keyInsight:
        segment.text.slice(0, 100) +
        (segment.text.length > 100 ? "..." : ""),
      dependsOn: [],
      standalone: true,
      hasFactualError: false,
      hasContradiction: false,
      isConfusing: hasUmAh && wordCount < 10,
      confusingDetail:
        hasUmAh && wordCount < 10 ? "Too many filler words" : undefined,
      isIncomplete: segment.text.trim().endsWith("..."),
      incompleteDetail: segment.text.trim().endsWith("...")
        ? "Thought appears incomplete"
        : undefined,
      needsRerecord: false,
    };
  }

  private extractMockTopic(text: string): string {
    const words = text.split(/\s+/).filter((w) => w.length > 3);
    const topicWords = words.slice(0, 3).join(" ");
    return topicWords || "General discussion";
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

/**
 * Factory function to create an AnalysisService instance
 */
export function createAnalysisService(options?: {
  useMock?: boolean;
}): AnalysisService {
  return new AnalysisService({
    useMock: options?.useMock ?? false,
  });
}
