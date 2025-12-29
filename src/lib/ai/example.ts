/**
 * Example usage of AI services for AeroPod Editor
 *
 * This file demonstrates how to use the AI analysis pipeline
 * in a real application context.
 */

import {
  createAnalysisService,
  selectBestSegments,
  createReorderService,
  validateReorderingDependencies,
  type SegmentWithAnalysis,
} from "./index";

/**
 * Example: Process a podcast episode through the complete AI pipeline
 */
export async function processEpisode(params: {
  segments: Array<{
    id: string;
    text: string;
    startTime: number;
    endTime: number;
  }>;
  targetDuration: number;
  useMock?: boolean;
}) {
  const { segments, targetDuration, useMock = false } = params;

  console.log(`Processing ${segments.length} segments...`);

  // Step 1: Analyze all segments
  console.log("Step 1: Analyzing segments with Claude...");
  const analysisService = createAnalysisService({ useMock });

  const analyses = await analysisService.analyzeBatch(
    segments.map((seg) => ({
      text: seg.text,
      startTime: seg.startTime,
      endTime: seg.endTime,
    }))
  );

  // Step 2: Combine segments with their analysis
  const segmentsWithAnalysis: SegmentWithAnalysis[] = segments.map(
    (seg, idx) => ({
      id: seg.id,
      startTime: seg.startTime,
      endTime: seg.endTime,
      text: seg.text,
      analysis: analyses[idx],
    })
  );

  // Step 3: Select the best segments
  console.log("Step 2: Selecting best segments...");
  const selection = selectBestSegments(segmentsWithAnalysis, targetDuration, {
    minScoreThreshold: 50,
    allowTangents: false,
    allowRepetitions: false,
    preferStandalone: true,
  });

  console.log(`Selected ${selection.selectedSegments.length} segments`);
  console.log(`Total duration: ${selection.totalDuration}s (target: ${targetDuration}s)`);
  console.log(`Average interest: ${selection.averageInterestScore}`);
  console.log(`Average clarity: ${selection.averageClarityScore}`);
  console.log(`Removed ${selection.removedCount} segments:`);
  console.log(selection.removedReasons);

  // Step 4: Reorder segments for optimal narrative
  console.log("Step 3: Reordering segments for best narrative flow...");
  const reorderService = createReorderService({ useMock });

  const reorderResult = await reorderService.suggestReordering(
    selection.selectedSegments.map((seg, idx) => ({
      id: seg.id,
      text: seg.text,
      analysis: seg.analysis,
      originalOrder: idx,
    })),
    {
      preserveOriginalOrder: false,
      allowMajorReordering: true,
    }
  );

  // Step 5: Validate the suggested ordering
  console.log("Step 4: Validating dependencies...");
  const validation = validateReorderingDependencies(
    selection.selectedSegments.map((seg, idx) => ({
      id: seg.id,
      text: seg.text,
      analysis: seg.analysis,
      originalOrder: idx,
    })),
    reorderResult.suggestedOrder
  );

  if (!validation.valid) {
    console.error("Dependency validation failed:", validation.errors);
    throw new Error("Cannot reorder segments: dependency constraints violated");
  }

  console.log("Step 5: Complete!");

  return {
    original: {
      segmentCount: segments.length,
      duration: segments.reduce(
        (sum, s) => sum + (s.endTime - s.startTime),
        0
      ),
    },
    selected: {
      segments: selection.selectedSegments,
      count: selection.selectedSegments.length,
      duration: selection.totalDuration,
      averageInterest: selection.averageInterestScore,
      averageClarity: selection.averageClarityScore,
    },
    reordering: {
      order: reorderResult.suggestedOrder,
      transitions: reorderResult.transitions,
      needsIntro: reorderResult.needsIntro,
      introSuggestion: reorderResult.introSuggestion,
      needsOutro: reorderResult.needsOutro,
      outroSuggestion: reorderResult.outroSuggestion,
      reasoning: reorderResult.reasoning,
    },
    removed: {
      count: selection.removedCount,
      reasons: selection.removedReasons,
    },
  };
}

/**
 * Example: Identify segments that need re-recording
 */
export async function identifyProblematicSegments(params: {
  segments: Array<{
    id: string;
    text: string;
    startTime: number;
    endTime: number;
  }>;
  useMock?: boolean;
}) {
  const { segments, useMock = false } = params;

  const analysisService = createAnalysisService({ useMock });

  const analyses = await analysisService.analyzeBatch(
    segments.map((seg) => ({
      text: seg.text,
      startTime: seg.startTime,
      endTime: seg.endTime,
    }))
  );

  const problematic = segments
    .map((seg, idx) => ({
      segment: seg,
      analysis: analyses[idx],
    }))
    .filter(
      ({ analysis }) =>
        analysis.needsRerecord ||
        analysis.hasFactualError ||
        analysis.hasContradiction ||
        (analysis.isConfusing && analysis.clarityScore < 40)
    );

  return problematic.map(({ segment, analysis }) => ({
    id: segment.id,
    startTime: segment.startTime,
    endTime: segment.endTime,
    text: segment.text,
    issues: {
      hasFactualError: analysis.hasFactualError,
      factualErrorDetail: analysis.factualErrorDetail,
      hasContradiction: analysis.hasContradiction,
      contradictionDetail: analysis.contradictionDetail,
      isConfusing: analysis.isConfusing,
      confusingDetail: analysis.confusingDetail,
      needsRerecord: analysis.needsRerecord,
      rerecordSuggestion: analysis.rerecordSuggestion,
    },
    clarityScore: analysis.clarityScore,
  }));
}

/**
 * Example: Generate a report for a podcast episode
 */
export async function generateEpisodeReport(params: {
  segments: Array<{
    id: string;
    text: string;
    startTime: number;
    endTime: number;
  }>;
  useMock?: boolean;
}) {
  const { segments, useMock = false } = params;

  const analysisService = createAnalysisService({ useMock });

  const analyses = await analysisService.analyzeBatch(
    segments.map((seg) => ({
      text: seg.text,
      startTime: seg.startTime,
      endTime: seg.endTime,
    }))
  );

  const totalDuration = segments.reduce(
    (sum, s) => sum + (s.endTime - s.startTime),
    0
  );

  const avgInterest =
    analyses.reduce((sum, a) => sum + a.interestScore, 0) / analyses.length;
  const avgClarity =
    analyses.reduce((sum, a) => sum + a.clarityScore, 0) / analyses.length;

  const topics = new Map<string, number>();
  analyses.forEach((a) => {
    topics.set(a.topic, (topics.get(a.topic) || 0) + 1);
  });

  const issues = {
    tangents: analyses.filter((a) => a.isTangent).length,
    repetitions: analyses.filter((a) => a.isRepetition).length,
    factualErrors: analyses.filter((a) => a.hasFactualError).length,
    contradictions: analyses.filter((a) => a.hasContradiction).length,
    confusing: analyses.filter((a) => a.isConfusing).length,
    incomplete: analyses.filter((a) => a.isIncomplete).length,
    needsRerecord: analyses.filter((a) => a.needsRerecord).length,
  };

  const qualityDistribution = {
    excellent: analyses.filter((a) => a.interestScore >= 80).length,
    good: analyses.filter((a) => a.interestScore >= 60 && a.interestScore < 80)
      .length,
    average: analyses.filter((a) => a.interestScore >= 40 && a.interestScore < 60)
      .length,
    poor: analyses.filter((a) => a.interestScore < 40).length,
  };

  return {
    summary: {
      segmentCount: segments.length,
      totalDuration: Math.round(totalDuration),
      averageInterestScore: Math.round(avgInterest),
      averageClarityScore: Math.round(avgClarity),
    },
    topics: Object.fromEntries(topics),
    issues,
    qualityDistribution,
    topSegments: segments
      .map((seg, idx) => ({
        id: seg.id,
        startTime: seg.startTime,
        endTime: seg.endTime,
        text: seg.text.slice(0, 100) + "...",
        interestScore: analyses[idx].interestScore,
        clarityScore: analyses[idx].clarityScore,
        topic: analyses[idx].topic,
        keyInsight: analyses[idx].keyInsight,
      }))
      .sort((a, b) => b.interestScore - a.interestScore)
      .slice(0, 5),
    problematicSegments: segments
      .map((seg, idx) => ({
        id: seg.id,
        startTime: seg.startTime,
        endTime: seg.endTime,
        text: seg.text.slice(0, 100) + "...",
        issues: {
          isTangent: analyses[idx].isTangent,
          isRepetition: analyses[idx].isRepetition,
          hasFactualError: analyses[idx].hasFactualError,
          hasContradiction: analyses[idx].hasContradiction,
          isConfusing: analyses[idx].isConfusing,
          needsRerecord: analyses[idx].needsRerecord,
        },
      }))
      .filter((seg) => Object.values(seg.issues).some((v) => v))
      .slice(0, 10),
  };
}

/**
 * Example: Quick quality check of a podcast
 */
export async function quickQualityCheck(params: {
  segments: Array<{
    id: string;
    text: string;
    startTime: number;
    endTime: number;
  }>;
  useMock?: boolean;
}) {
  const { segments, useMock = false } = params;

  // Sample every 5th segment for quick analysis
  const sampleSegments = segments.filter((_, idx) => idx % 5 === 0);

  const analysisService = createAnalysisService({ useMock });

  const analyses = await analysisService.analyzeBatch(
    sampleSegments.map((seg) => ({
      text: seg.text,
      startTime: seg.startTime,
      endTime: seg.endTime,
    }))
  );

  const avgInterest =
    analyses.reduce((sum, a) => sum + a.interestScore, 0) / analyses.length;
  const avgClarity =
    analyses.reduce((sum, a) => sum + a.clarityScore, 0) / analyses.length;

  const issueRate =
    analyses.filter(
      (a) =>
        a.isTangent ||
        a.isRepetition ||
        a.hasFactualError ||
        a.hasContradiction ||
        a.needsRerecord
    ).length / analyses.length;

  let quality: "excellent" | "good" | "fair" | "poor";
  if (avgInterest >= 70 && avgClarity >= 70 && issueRate < 0.1) {
    quality = "excellent";
  } else if (avgInterest >= 60 && avgClarity >= 60 && issueRate < 0.2) {
    quality = "good";
  } else if (avgInterest >= 50 && avgClarity >= 50 && issueRate < 0.3) {
    quality = "fair";
  } else {
    quality = "poor";
  }

  return {
    quality,
    sampleSize: sampleSegments.length,
    estimatedInterest: Math.round(avgInterest),
    estimatedClarity: Math.round(avgClarity),
    estimatedIssueRate: Math.round(issueRate * 100),
    recommendation:
      quality === "excellent"
        ? "Podcast is high quality. Minimal editing needed."
        : quality === "good"
          ? "Podcast is good quality. Some selective editing recommended."
          : quality === "fair"
            ? "Podcast needs moderate editing. Focus on removing low-value segments."
            : "Podcast needs significant editing or re-recording.",
  };
}
