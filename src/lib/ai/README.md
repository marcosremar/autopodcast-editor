# AI Services for AutoPodcast Editor

This directory contains AI-powered services for analyzing, selecting, and reordering podcast segments using Claude (Anthropic).

## Overview

The AI analysis pipeline consists of three main services:

1. **AnalysisService** (`analyze.ts`) - Analyzes individual podcast segments using Claude
2. **Selection Algorithm** (`selection.ts`) - Selects the best segments based on analysis
3. **ReorderService** (`reorder.ts`) - Suggests optimal ordering for selected segments

## Installation

The required package is already installed:
```bash
npm install @anthropic-ai/sdk
```

## Environment Setup

Add your Anthropic API key to your environment variables:
```bash
ANTHROPIC_API_KEY=your_api_key_here
```

## Usage Examples

### 1. Analyzing Segments

```typescript
import { createAnalysisService } from '@/lib/ai';

// Create service (uses ANTHROPIC_API_KEY from environment)
const analysisService = createAnalysisService();

// Or use mock mode for testing
const mockService = createAnalysisService({ useMock: true });

// Analyze a single segment
const segment = {
  text: "Today we're going to talk about artificial intelligence...",
  startTime: 0,
  endTime: 15.5,
  previousSegments: [] // optional context
};

const analysis = await analysisService.analyzeSegment(segment);

console.log(analysis);
// {
//   topic: "Introduction to AI",
//   interestScore: 75,
//   clarityScore: 85,
//   isTangent: false,
//   isRepetition: false,
//   keyInsight: "Setting up the topic of AI discussion",
//   dependsOn: [],
//   standalone: true,
//   hasFactualError: false,
//   hasContradiction: false,
//   isConfusing: false,
//   isIncomplete: false,
//   needsRerecord: false
// }
```

### 2. Batch Analysis

```typescript
import { createAnalysisService } from '@/lib/ai';

const segments = [
  { text: "...", startTime: 0, endTime: 15 },
  { text: "...", startTime: 15, endTime: 30 },
  { text: "...", startTime: 30, endTime: 45 },
];

const analysisService = createAnalysisService();
const analyses = await analysisService.analyzeBatch(segments);

// Analyses include context from previous segments
console.log(analyses.length); // 3
```

### 3. Selecting Best Segments

```typescript
import { selectBestSegments } from '@/lib/ai';

const segmentsWithAnalysis = [
  {
    id: "seg-1",
    startTime: 0,
    endTime: 30,
    text: "...",
    analysis: { /* from step 1 */ }
  },
  // ... more segments
];

const targetDuration = 300; // 5 minutes in seconds

const result = selectBestSegments(segmentsWithAnalysis, targetDuration, {
  minScoreThreshold: 50,
  allowTangents: false,
  allowRepetitions: false,
  preferStandalone: true
});

console.log(result);
// {
//   selectedSegments: [...],
//   totalDuration: 298,
//   averageInterestScore: 72,
//   averageClarityScore: 78,
//   removedCount: 5,
//   removedReasons: {
//     low_score: 2,
//     tangent: 1,
//     repetition: 2
//   }
// }
```

### 4. Reordering Segments

```typescript
import { createReorderService } from '@/lib/ai';

const reorderService = createReorderService();

const selectedSegments = [
  {
    id: "seg-1",
    text: "...",
    analysis: { /* ... */ },
    originalOrder: 0
  },
  // ... more segments
];

const reorderResult = await reorderService.suggestReordering(
  selectedSegments,
  {
    preserveOriginalOrder: false,
    allowMajorReordering: true
  }
);

console.log(reorderResult);
// {
//   suggestedOrder: ["seg-3", "seg-1", "seg-5", "seg-2"],
//   transitions: [
//     {
//       beforeSegmentId: "seg-3",
//       afterSegmentId: "seg-1",
//       transitionText: "Now let's dive deeper into...",
//       reasoning: "Topic shift requires transition"
//     }
//   ],
//   needsIntro: true,
//   introSuggestion: "Welcome to today's episode...",
//   needsOutro: true,
//   outroSuggestion: "Thanks for listening...",
//   reasoning: "Reordered to improve narrative flow..."
// }
```

### 5. Validating Dependencies

```typescript
import { validateReorderingDependencies } from '@/lib/ai';

const validation = validateReorderingDependencies(
  selectedSegments,
  ["seg-2", "seg-1", "seg-3"] // proposed order
);

if (!validation.valid) {
  console.error("Dependency errors:", validation.errors);
  // ["Segment 'Advanced AI' depends on 'AI Basics' but comes before it"]
}
```

### 6. Complete Pipeline Example

```typescript
import {
  createAnalysisService,
  selectBestSegments,
  createReorderService
} from '@/lib/ai';

async function processPodcast(rawSegments, targetDuration) {
  // Step 1: Analyze all segments
  const analysisService = createAnalysisService();
  const analyses = await analysisService.analyzeBatch(
    rawSegments.map(seg => ({
      text: seg.text,
      startTime: seg.startTime,
      endTime: seg.endTime
    }))
  );

  // Step 2: Combine segments with analysis
  const segmentsWithAnalysis = rawSegments.map((seg, idx) => ({
    id: seg.id,
    startTime: seg.startTime,
    endTime: seg.endTime,
    text: seg.text,
    analysis: analyses[idx]
  }));

  // Step 3: Select best segments
  const selection = selectBestSegments(
    segmentsWithAnalysis,
    targetDuration
  );

  console.log(`Selected ${selection.selectedSegments.length} segments`);
  console.log(`Total duration: ${selection.totalDuration}s`);
  console.log(`Removed ${selection.removedCount} segments`);

  // Step 4: Reorder for optimal narrative
  const reorderService = createReorderService();
  const reordering = await reorderService.suggestReordering(
    selection.selectedSegments.map((seg, idx) => ({
      id: seg.id,
      text: seg.text,
      analysis: seg.analysis,
      originalOrder: idx
    }))
  );

  console.log(`Suggested order: ${reordering.suggestedOrder.join(' -> ')}`);
  console.log(`Transitions needed: ${reordering.transitions.length}`);

  return {
    selectedSegments: selection.selectedSegments,
    suggestedOrder: reordering.suggestedOrder,
    transitions: reordering.transitions,
    intro: reordering.introSuggestion,
    outro: reordering.outroSuggestion,
    stats: {
      totalDuration: selection.totalDuration,
      averageInterest: selection.averageInterestScore,
      averageClarity: selection.averageClarityScore
    }
  };
}
```

## Testing

All services support mock mode for testing without API calls:

```typescript
// Analysis with mock
const mockAnalysis = createAnalysisService({ useMock: true });
const result = await mockAnalysis.analyzeSegment(segment);

// Reordering with mock
const mockReorder = createReorderService({ useMock: true });
const reorder = await mockReorder.suggestReordering(segments);
```

## API Reference

### AnalysisService

- `analyzeSegment(segment)` - Analyze a single segment
- `analyzeBatch(segments, options?)` - Analyze multiple segments with context

### Selection Functions

- `selectBestSegments(segments, targetDuration, options?)` - Select best segments
- `estimateCompressionRatio(segments)` - Estimate how much can be compressed
- `suggestTargetDuration(segments, options?)` - Suggest optimal target duration

### ReorderService

- `suggestReordering(segments, options?)` - Suggest optimal segment order

### Validation

- `validateReorderingDependencies(segments, proposedOrder)` - Validate dependency constraints

## Models Used

All services use `claude-3-5-sonnet-20241022` by default, which provides:
- High-quality analysis and reasoning
- Fast response times
- Cost-effective pricing
- Strong understanding of narrative structure

## Error Handling

All services throw descriptive errors that should be caught:

```typescript
try {
  const analysis = await analysisService.analyzeSegment(segment);
} catch (error) {
  console.error("Analysis failed:", error.message);
  // Handle error appropriately
}
```

## Rate Limiting

The batch analysis includes a 100ms delay between segments to avoid rate limits. For production use with large batches, consider:

1. Implementing exponential backoff
2. Using a queue system
3. Batching with Claude's batch API (if available)

## Cost Estimation

Approximate costs using Claude 3.5 Sonnet:
- Analysis per segment: ~$0.001 - $0.002
- Reordering (10 segments): ~$0.01 - $0.02

For a 60-minute podcast split into 120 segments:
- Analysis: ~$0.12 - $0.24
- Selection: Free (pure algorithm)
- Reordering (20 selected): ~$0.02 - $0.04
- **Total: ~$0.14 - $0.28 per episode**
