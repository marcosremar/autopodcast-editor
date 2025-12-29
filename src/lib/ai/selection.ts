import type { SegmentAnalysis } from "@/lib/db/schema";

export interface SegmentWithAnalysis {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  analysis: SegmentAnalysis;
}

export interface SelectionOptions {
  minScoreThreshold?: number;
  allowTangents?: boolean;
  allowRepetitions?: boolean;
  preferStandalone?: boolean;
}

export interface SelectionResult {
  selectedSegments: SegmentWithAnalysis[];
  totalDuration: number;
  averageInterestScore: number;
  averageClarityScore: number;
  removedCount: number;
  removedReasons: Record<string, number>;
}

const DEFAULT_MIN_SCORE_THRESHOLD = 50;

/**
 * Selects the best segments for the final podcast based on analysis and target duration.
 *
 * Algorithm:
 * 1. Filter by minimum score threshold (default: 50)
 * 2. Remove segments marked as tangent or repetition (unless options allow)
 * 3. Keep segments that others depend on (dependency graph)
 * 4. Rank by combined score (interestScore * clarityScore)
 * 5. Select segments until target duration is reached
 *
 * @param segments - Array of segments with analysis
 * @param targetDuration - Target duration in seconds
 * @param options - Optional configuration
 * @returns Selection result with chosen segments and metadata
 */
export function selectBestSegments(
  segments: SegmentWithAnalysis[],
  targetDuration: number,
  options: SelectionOptions = {}
): SelectionResult {
  const {
    minScoreThreshold = DEFAULT_MIN_SCORE_THRESHOLD,
    allowTangents = false,
    allowRepetitions = false,
    preferStandalone = true,
  } = options;

  const removedReasons: Record<string, number> = {};
  const incrementRemovalReason = (reason: string) => {
    removedReasons[reason] = (removedReasons[reason] || 0) + 1;
  };

  // Step 1: Build dependency graph
  const dependencyMap = buildDependencyMap(segments);

  // Step 2: Filter segments
  const filtered = segments.filter((segment) => {
    const { analysis } = segment;

    // Check score threshold
    const combinedScore = Math.sqrt(
      analysis.interestScore * analysis.clarityScore
    );
    if (combinedScore < minScoreThreshold) {
      incrementRemovalReason("low_score");
      return false;
    }

    // Check tangent
    if (!allowTangents && analysis.isTangent) {
      incrementRemovalReason("tangent");
      return false;
    }

    // Check repetition
    if (!allowRepetitions && analysis.isRepetition) {
      incrementRemovalReason("repetition");
      return false;
    }

    // Check if needs re-record
    if (analysis.needsRerecord) {
      incrementRemovalReason("needs_rerecord");
      return false;
    }

    // Check factual errors
    if (analysis.hasFactualError) {
      incrementRemovalReason("factual_error");
      return false;
    }

    return true;
  });

  // Step 3: Calculate scores and rank
  const scored = filtered.map((segment) => {
    const { analysis } = segment;

    // Base score: geometric mean of interest and clarity
    let score =
      Math.sqrt(analysis.interestScore * analysis.clarityScore);

    // Bonus for standalone segments (if preferred)
    if (preferStandalone && analysis.standalone) {
      score *= 1.1;
    }

    // Penalty for confusing content
    if (analysis.isConfusing) {
      score *= 0.8;
    }

    // Penalty for incomplete content
    if (analysis.isIncomplete) {
      score *= 0.9;
    }

    // Bonus if other segments depend on this one
    const dependentCount = dependencyMap.get(segment.id)?.length || 0;
    if (dependentCount > 0) {
      score *= 1 + (dependentCount * 0.05); // 5% bonus per dependent
    }

    return {
      segment,
      score,
      duration: segment.endTime - segment.startTime,
    };
  });

  // Sort by score (descending)
  scored.sort((a, b) => b.score - a.score);

  // Step 4: Select segments up to target duration
  // We use a greedy approach, but ensure dependencies are met
  const selected = new Set<string>();
  const selectedSegments: SegmentWithAnalysis[] = [];
  let currentDuration = 0;

  for (const item of scored) {
    const segmentDuration = item.duration;

    // Check if adding this segment would exceed target
    if (currentDuration + segmentDuration > targetDuration && selected.size > 0) {
      // We have at least one segment, and this would exceed. Stop here.
      break;
    }

    // Add this segment
    selected.add(item.segment.id);
    selectedSegments.push(item.segment);
    currentDuration += segmentDuration;

    // Check if we need to add dependencies
    const deps = item.segment.analysis.dependsOn || [];
    for (const depTopic of deps) {
      // Find segments with matching topic that aren't selected yet
      const depSegment = segments.find(
        (s) => s.analysis.topic === depTopic && !selected.has(s.id)
      );

      if (depSegment) {
        const depDuration = depSegment.endTime - depSegment.startTime;

        // Add dependency even if it exceeds target (dependencies are critical)
        selected.add(depSegment.id);
        selectedSegments.push(depSegment);
        currentDuration += depDuration;
      }
    }

    // If we've reached or exceeded target, stop
    if (currentDuration >= targetDuration) {
      break;
    }
  }

  // Step 5: Sort selected segments by original time order
  selectedSegments.sort((a, b) => a.startTime - b.startTime);

  // Calculate statistics
  const avgInterest =
    selectedSegments.reduce((sum, s) => sum + s.analysis.interestScore, 0) /
    (selectedSegments.length || 1);

  const avgClarity =
    selectedSegments.reduce((sum, s) => sum + s.analysis.clarityScore, 0) /
    (selectedSegments.length || 1);

  return {
    selectedSegments,
    totalDuration: currentDuration,
    averageInterestScore: Math.round(avgInterest),
    averageClarityScore: Math.round(avgClarity),
    removedCount: segments.length - selectedSegments.length,
    removedReasons,
  };
}

/**
 * Builds a map of segment IDs to segments that depend on them
 */
function buildDependencyMap(
  segments: SegmentWithAnalysis[]
): Map<string, SegmentWithAnalysis[]> {
  const map = new Map<string, SegmentWithAnalysis[]>();

  for (const segment of segments) {
    const deps = segment.analysis.dependsOn || [];

    for (const depTopic of deps) {
      // Find all segments with this topic
      const depSegments = segments.filter(
        (s) => s.analysis.topic === depTopic
      );

      for (const depSegment of depSegments) {
        if (!map.has(depSegment.id)) {
          map.set(depSegment.id, []);
        }
        map.get(depSegment.id)!.push(segment);
      }
    }
  }

  return map;
}

/**
 * Estimates how much a segment list can be compressed
 */
export function estimateCompressionRatio(
  segments: SegmentWithAnalysis[]
): number {
  const totalDuration = segments.reduce(
    (sum, s) => sum + (s.endTime - s.startTime),
    0
  );

  // Count low-value content
  const lowValueDuration = segments
    .filter(
      (s) =>
        s.analysis.isTangent ||
        s.analysis.isRepetition ||
        s.analysis.interestScore < 40 ||
        s.analysis.clarityScore < 40
    )
    .reduce((sum, s) => sum + (s.endTime - s.startTime), 0);

  const keepDuration = totalDuration - lowValueDuration;
  return totalDuration > 0 ? keepDuration / totalDuration : 1;
}

/**
 * Suggests an optimal target duration based on content analysis
 */
export function suggestTargetDuration(
  segments: SegmentWithAnalysis[],
  options: {
    minCompressionRatio?: number;
    maxCompressionRatio?: number;
  } = {}
): number {
  const { minCompressionRatio = 0.5, maxCompressionRatio = 0.9 } = options;

  const totalDuration = segments.reduce(
    (sum, s) => sum + (s.endTime - s.startTime),
    0
  );

  const estimatedRatio = estimateCompressionRatio(segments);

  // Clamp the ratio between min and max
  const targetRatio = Math.max(
    minCompressionRatio,
    Math.min(maxCompressionRatio, estimatedRatio)
  );

  return Math.round(totalDuration * targetRatio);
}
