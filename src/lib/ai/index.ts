/**
 * AI Services for AeroPod Editor
 *
 * This module provides AI-powered analysis, selection, and reordering
 * of podcast segments using Claude (Anthropic).
 */

export {
  AnalysisService,
  createAnalysisService,
  type SegmentWithContext,
  type BatchAnalysisOptions,
} from "./analyze";

export {
  selectBestSegments,
  estimateCompressionRatio,
  suggestTargetDuration,
  type SegmentWithAnalysis,
  type SelectionOptions,
  type SelectionResult,
} from "./selection";

export {
  ReorderService,
  createReorderService,
  validateReorderingDependencies,
  type SegmentForReordering,
  type TransitionSuggestion,
  type ReorderResult,
  type ReorderOptions,
} from "./reorder";

export type { SegmentAnalysis } from "@/lib/db/schema";
