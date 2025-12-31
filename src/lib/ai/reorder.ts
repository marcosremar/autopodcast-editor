/**
 * Reorder Service
 * Sugere reordenação de segmentos para criar narrativa coerente
 * Usa AIService centralizado (Groq) em vez de Anthropic
 */

import { aiCompleteJSON } from "@/lib/ai/AIService";
import type { SegmentAnalysis } from "@/lib/db/schema";

export interface SegmentForReordering {
  id: string;
  text: string;
  analysis: SegmentAnalysis;
  originalOrder: number;
}

export interface TransitionSuggestion {
  beforeSegmentId: string;
  afterSegmentId: string;
  transitionText: string;
  reasoning: string;
}

export interface ReorderResult {
  suggestedOrder: string[]; // Array of segment IDs in recommended order
  transitions: TransitionSuggestion[];
  needsIntro: boolean;
  introSuggestion?: string;
  needsOutro: boolean;
  outroSuggestion?: string;
  reasoning: string;
}

export interface ReorderOptions {
  useMock?: boolean;
  preserveOriginalOrder?: boolean;
  allowMajorReordering?: boolean;
}

export class ReorderService {
  private useMock: boolean = false;

  constructor(options?: { useMock?: boolean }) {
    this.useMock = options?.useMock ?? false;
    // AIService é inicializado automaticamente via singleton
  }

  /**
   * Suggests optimal ordering for selected segments to create a coherent narrative
   */
  async suggestReordering(
    segments: SegmentForReordering[],
    options: ReorderOptions = {}
  ): Promise<ReorderResult> {
    if (this.useMock) {
      return this.generateMockReordering(segments, options);
    }

    const prompt = this.buildReorderPrompt(segments, options);

    try {
      const result = await aiCompleteJSON<ReorderResult>("segment_reorder", prompt);
      return this.validateReorderResult(result, segments);
    } catch (error) {
      console.error("Error reordering segments:", error);
      throw new Error(
        `Failed to reorder segments: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Builds the reordering prompt for AI
   */
  private buildReorderPrompt(
    segments: SegmentForReordering[],
    options: ReorderOptions
  ): string {
    const { preserveOriginalOrder = false, allowMajorReordering = true } = options;

    const segmentsList = segments
      .map(
        (seg, idx) => `
Segment ${idx + 1} (ID: ${seg.id}):
Topic: ${seg.analysis.topic}
Text: "${seg.text}"
Interest Score: ${seg.analysis.interestScore}
Clarity Score: ${seg.analysis.clarityScore}
Key Insight: ${seg.analysis.keyInsight}
Depends On: ${seg.analysis.dependsOn.length > 0 ? seg.analysis.dependsOn.join(", ") : "None"}
Standalone: ${seg.analysis.standalone}
`
      )
      .join("\n---\n");

    const constraints = preserveOriginalOrder
      ? "You should maintain the original order unless absolutely necessary for coherence."
      : allowMajorReordering
        ? "You are free to reorder segments significantly to create the best narrative flow."
        : "You can make minor reorderings but try to keep segments roughly in their original sequence.";

    return `You are a podcast editor tasked with arranging selected segments into the most compelling and coherent narrative order.

## Segments to Arrange

${segmentsList}

## Task

Analyze these segments and suggest the optimal order for the final podcast. Consider:

1. **Narrative Flow**: Does the story/discussion flow logically?
2. **Dependencies**: Segments that depend on others must come after their dependencies
3. **Interest Curve**: Build interest throughout, avoid putting all high-interest content at the start
4. **Topic Grouping**: Related topics should generally be together
5. **Transitions**: Identify where transitions may be needed between segments

## Constraints

${constraints}

## Output Format

Return a JSON object with this structure:

{
  "suggestedOrder": ["segment-id-1", "segment-id-2", ...],
  "transitions": [
    {
      "beforeSegmentId": "id-1",
      "afterSegmentId": "id-2",
      "transitionText": "A suggested transition sentence or phrase",
      "reasoning": "Why a transition is needed here"
    }
  ],
  "needsIntro": true/false,
  "introSuggestion": "A suggested introduction if needed",
  "needsOutro": true/false,
  "outroSuggestion": "A suggested outro/conclusion if needed",
  "reasoning": "Overall explanation of your reordering decisions"
}

Rules:
- suggestedOrder must contain ALL segment IDs exactly once
- Only suggest transitions where there's a significant topic shift or logical gap
- Intro/outro suggestions should be brief (1-3 sentences)
- If the original order is already optimal, you can keep it

Return ONLY valid JSON, no other text.`;
  }

  /**
   * Validates the reorder result from AI
   */
  private validateReorderResult(
    result: any,
    originalSegments: SegmentForReordering[]
  ): ReorderResult {
    // Ensure all segment IDs are present
    const originalIds = new Set(originalSegments.map((s) => s.id));
    const suggestedIds = new Set(result.suggestedOrder || []);

    if (originalIds.size !== suggestedIds.size) {
      throw new Error("Reordering result doesn't contain all segment IDs");
    }

    for (const id of originalIds) {
      if (!suggestedIds.has(id)) {
        throw new Error(`Missing segment ID in reordering: ${id}`);
      }
    }

    return {
      suggestedOrder: result.suggestedOrder,
      transitions: result.transitions || [],
      needsIntro: result.needsIntro ?? false,
      introSuggestion: result.introSuggestion,
      needsOutro: result.needsOutro ?? false,
      outroSuggestion: result.outroSuggestion,
      reasoning: result.reasoning || "No reasoning provided",
    };
  }

  /**
   * Generates a mock reordering for testing
   */
  private generateMockReordering(
    segments: SegmentForReordering[],
    options: ReorderOptions
  ): ReorderResult {
    const { preserveOriginalOrder = false } = options;

    let orderedSegments = [...segments];

    if (!preserveOriginalOrder) {
      // Simple reordering strategy for mock:
      // 1. Put standalone, high-interest segments first
      // 2. Follow with segments that have dependencies
      // 3. Sort by combined score within each group

      const standalone = orderedSegments.filter((s) => s.analysis.standalone);
      const dependent = orderedSegments.filter((s) => !s.analysis.standalone);

      standalone.sort(
        (a, b) =>
          b.analysis.interestScore +
          b.analysis.clarityScore -
          (a.analysis.interestScore + a.analysis.clarityScore)
      );

      dependent.sort(
        (a, b) =>
          b.analysis.interestScore +
          b.analysis.clarityScore -
          (a.analysis.interestScore + a.analysis.clarityScore)
      );

      orderedSegments = [...standalone, ...dependent];
    }

    const suggestedOrder = orderedSegments.map((s) => s.id);

    // Generate mock transitions where topics change significantly
    const transitions: TransitionSuggestion[] = [];
    for (let i = 0; i < orderedSegments.length - 1; i++) {
      const current = orderedSegments[i];
      const next = orderedSegments[i + 1];

      if (current.analysis.topic !== next.analysis.topic) {
        transitions.push({
          beforeSegmentId: current.id,
          afterSegmentId: next.id,
          transitionText: `Now let's shift our focus to ${next.analysis.topic.toLowerCase()}.`,
          reasoning: "Topic change detected",
        });
      }
    }

    // Suggest intro if first segment isn't standalone
    const needsIntro = orderedSegments.length > 0 && !orderedSegments[0].analysis.standalone;
    const introSuggestion = needsIntro
      ? `Welcome to this episode. Today we'll be discussing ${orderedSegments[0].analysis.topic.toLowerCase()}.`
      : undefined;

    // Suggest outro
    const needsOutro = orderedSegments.length > 0;
    const outroSuggestion = needsOutro
      ? `Thanks for listening. We covered a lot today, from ${orderedSegments[0].analysis.topic.toLowerCase()} to ${orderedSegments[orderedSegments.length - 1].analysis.topic.toLowerCase()}.`
      : undefined;

    return {
      suggestedOrder,
      transitions,
      needsIntro,
      introSuggestion,
      needsOutro,
      outroSuggestion,
      reasoning: preserveOriginalOrder
        ? "Maintained original order as requested"
        : "Reordered to improve narrative flow: standalone high-interest segments first, then dependent segments",
    };
  }
}

/**
 * Factory function to create a ReorderService instance
 */
export function createReorderService(
  options?: {
    useMock?: boolean;
  }
): ReorderService {
  const useMock = options?.useMock ?? false;
  return new ReorderService({ useMock });
}

/**
 * Validates that segments can be reordered while respecting dependencies
 */
export function validateReorderingDependencies(
  segments: SegmentForReordering[],
  proposedOrder: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const segmentMap = new Map(segments.map((s) => [s.id, s]));
  const positionMap = new Map(proposedOrder.map((id, idx) => [id, idx]));

  for (const segmentId of proposedOrder) {
    const segment = segmentMap.get(segmentId);
    if (!segment) {
      errors.push(`Segment ${segmentId} not found in original segments`);
      continue;
    }

    const segmentPosition = positionMap.get(segmentId)!;

    // Check dependencies
    for (const depTopic of segment.analysis.dependsOn) {
      // Find segment with this topic
      const depSegment = segments.find((s) => s.analysis.topic === depTopic);
      if (depSegment) {
        const depPosition = positionMap.get(depSegment.id);
        if (depPosition !== undefined && depPosition >= segmentPosition) {
          errors.push(
            `Segment "${segment.analysis.topic}" depends on "${depTopic}" but comes before it`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
