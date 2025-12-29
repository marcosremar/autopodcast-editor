# Audio Processing Infrastructure

This directory contains the core audio processing infrastructure for the AutoPodcast editor. It provides a complete pipeline for transcribing, chunking, and exporting podcast audio.

## Overview

The audio processing pipeline consists of four main components:

1. **Storage** (`../storage/s3.ts`) - S3-compatible storage for audio files
2. **Transcription** (`transcription.ts`) - Whisper-based transcription via Replicate
3. **Chunking** (`chunking.ts`) - Smart segmentation into 30-60 second chunks
4. **Export** (`export.ts`) - FFmpeg-based audio export and concatenation

## Architecture

```
Audio File → Storage → Transcription → Chunking → Export
                ↓           ↓            ↓          ↓
              S3/R2      Whisper    Smart Split   FFmpeg
```

## Components

### 1. Storage (`../storage/s3.ts`)

S3-compatible storage client supporting AWS S3, Cloudflare R2, and other S3-compatible services.

**Interfaces:**
- `StorageClient` - Main interface for storage operations
- `S3StorageClient` - Real S3/R2 implementation
- `MockStorageClient` - In-memory mock for testing

**Environment Variables:**
```bash
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_BUCKET=your_bucket_name
S3_ENDPOINT=https://your-endpoint.com  # Optional, for R2/MinIO
S3_REGION=auto  # Optional, defaults to 'auto'
```

**Example Usage:**
```typescript
import { createStorageClient } from '@/lib/storage';

// Production
const storage = createStorageClient();

// Testing
const storage = createStorageClient(true);

// Upload
const { key, url } = await storage.upload({
  key: 'audio/episode-123.mp3',
  body: audioBuffer,
  contentType: 'audio/mpeg',
});

// Download
const buffer = await storage.download({ key: 'audio/episode-123.mp3' });

// Signed URL
const signedUrl = await storage.getSignedUrl({
  key: 'audio/episode-123.mp3',
  expiresIn: 3600, // 1 hour
});
```

### 2. Transcription (`transcription.ts`)

Transcribes audio using OpenAI's Whisper model via Replicate API.

**Interfaces:**
- `TranscriptionService` - Main interface
- `TranscriptionResult` - Result with text and timestamped segments
- `ReplicateTranscriptionService` - Real Replicate API implementation
- `MockTranscriptionService` - Mock for testing

**Environment Variables:**
```bash
REPLICATE_API_TOKEN=your_replicate_token
```

**Example Usage:**
```typescript
import { createTranscriptionService } from '@/lib/audio';

// Production
const transcription = createTranscriptionService();

// Testing
const transcription = createTranscriptionService(true);

const result = await transcription.transcribe({
  audioUrl: 'https://storage.example.com/audio.mp3',
  language: 'en', // Optional, auto-detect if not specified
  prompt: 'Podcast episode about...',  // Optional guidance
});

console.log(result.text); // Full transcript
console.log(result.segments); // Timestamped segments
// [
//   { id: 0, start: 0.0, end: 5.2, text: "Welcome to the podcast." },
//   { id: 1, start: 5.2, end: 10.5, text: "Today we're discussing..." }
// ]
```

### 3. Chunking (`chunking.ts`)

Splits transcription segments into optimal 30-60 second chunks, respecting natural pauses and sentence boundaries.

**Key Functions:**
- `chunkTranscription()` - Main chunking algorithm
- `mergeChunks()` - Combine multiple chunks
- `splitChunkAtTime()` - Split a chunk at a specific time
- `validateChunks()` - Validate chunk ordering and overlap

**Example Usage:**
```typescript
import { chunkTranscription, validateChunks } from '@/lib/audio';

const chunks = chunkTranscription(transcriptionResult.segments, {
  minDuration: 30,  // Minimum 30 seconds
  maxDuration: 60,  // Maximum 60 seconds
  preferSentenceBoundaries: true,  // Break at sentence endings
});

// Each chunk contains:
// {
//   id: 'chunk-0',
//   startTime: 0.0,
//   endTime: 45.2,
//   text: 'Combined text of all segments in chunk',
//   segmentIds: [0, 1, 2, 3]
// }

// Validate chunks
if (!validateChunks(chunks)) {
  console.error('Invalid chunks: overlapping or out of order');
}
```

**Chunking Algorithm:**
1. Starts with the first segment
2. Accumulates segments until reaching minDuration (30s)
3. Looks for natural break points:
   - Sentence endings (. ! ?)
   - Long pauses (>1 second between segments)
4. Creates new chunk when:
   - Natural break found after minDuration
   - maxDuration (60s) would be exceeded
5. Ensures no overlaps and proper ordering

### 4. Export (`export.ts`)

FFmpeg-based audio export with segment extraction and crossfade concatenation.

**Interfaces:**
- `ExportService` - Main interface
- `FFmpegExportService` - Real FFmpeg implementation
- `MockExportService` - Mock for testing

**Example Usage:**
```typescript
import { createExportService } from '@/lib/audio';

// Production (requires FFmpeg installed)
const exporter = createExportService();

// Testing
const exporter = createExportService(true);

// Extract a single segment
const segmentBuffer = await exporter.extractSegment({
  inputPath: '/path/to/audio.mp3',
  startTime: 10.5,
  endTime: 45.2,
  outputFormat: 'mp3',
});

// Concatenate multiple segments with crossfade
const finalAudio = await exporter.concatenateSegments({
  segments: [
    { path: '/path/to/segment1.mp3', startTime: 0, endTime: 30 },
    { path: '/path/to/segment2.mp3', startTime: 15, endTime: 45 },
  ],
  crossfadeDuration: 0.5,  // 0.5 second crossfade
  outputFormat: 'mp3',
  bitrate: '192k',
});

// Extract all chunks from original audio
const chunkBuffers = await exporter.extractChunks(
  '/path/to/original.mp3',
  chunks,  // Array of AudioChunk objects
  { outputFormat: 'mp3', bitrate: '128k' }
);
```

## Complete Pipeline Example

Here's a complete example processing an audio file through the entire pipeline:

```typescript
import {
  createStorageClient,
  createTranscriptionService,
  createExportService,
  chunkTranscription,
} from '@/lib/audio';
import { readFile } from 'fs/promises';

async function processAudio(audioPath: string) {
  // 1. Upload to storage
  const storage = createStorageClient();
  const audioBuffer = await readFile(audioPath);

  const { url } = await storage.upload({
    key: `episodes/${Date.now()}.mp3`,
    body: audioBuffer,
    contentType: 'audio/mpeg',
  });

  console.log('Uploaded to:', url);

  // 2. Transcribe
  const transcriptionService = createTranscriptionService();
  const transcription = await transcriptionService.transcribe({
    audioUrl: url,
    language: 'en',
  });

  console.log('Transcribed:', transcription.text.substring(0, 100) + '...');
  console.log('Segments:', transcription.segments.length);

  // 3. Chunk
  const chunks = chunkTranscription(transcription.segments, {
    minDuration: 30,
    maxDuration: 60,
    preferSentenceBoundaries: true,
  });

  console.log('Created chunks:', chunks.length);

  // 4. Export chunks
  const exporter = createExportService();
  const chunkBuffers = await exporter.extractChunks(
    audioPath,
    chunks,
    { outputFormat: 'mp3', bitrate: '128k' }
  );

  console.log('Exported chunks:', chunkBuffers.length);

  // 5. Save chunks or do further processing
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const buffer = chunkBuffers[i];

    console.log(`Chunk ${i + 1}:`, {
      duration: chunk.endTime - chunk.startTime,
      text: chunk.text.substring(0, 50) + '...',
      size: buffer.length,
    });
  }

  return { transcription, chunks, chunkBuffers };
}

// Run
processAudio('./my-podcast.mp3')
  .then(() => console.log('Processing complete!'))
  .catch(console.error);
```

## Testing

All components include mock implementations for easy testing:

```typescript
import { describe, it, expect } from 'vitest';
import {
  MockStorageClient,
  MockTranscriptionService,
  MockExportService,
} from '@/lib/audio';

describe('Audio Pipeline', () => {
  it('should process audio end-to-end', async () => {
    const storage = new MockStorageClient();
    const transcription = new MockTranscriptionService(0);
    const exporter = new MockExportService();

    // Your test logic here...
  });
});
```

Run tests:
```bash
npm test -- src/__tests__/audio-pipeline.test.ts
```

## Dependencies

- `@aws-sdk/client-s3` - S3 SDK for storage
- `@aws-sdk/s3-request-presigner` - Signed URL generation
- `replicate` - Replicate API client for Whisper
- `fluent-ffmpeg` - FFmpeg wrapper for audio processing
- `@types/fluent-ffmpeg` - TypeScript types

Note: FFmpeg must be installed on the system for audio export to work:
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
apt-get install ffmpeg

# Windows
choco install ffmpeg
```

## Environment Setup

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
# Storage
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_BUCKET=your_bucket_name
S3_ENDPOINT=https://your-endpoint.com
S3_REGION=auto

# Transcription
REPLICATE_API_TOKEN=your_replicate_token
```

## Error Handling

All services throw descriptive errors:

```typescript
try {
  const result = await transcriptionService.transcribe({ audioUrl });
} catch (error) {
  if (error.message.includes('Transcription failed')) {
    // Handle transcription errors
  } else if (error.message.includes('REPLICATE_API_TOKEN')) {
    // Handle missing API token
  }
}
```

## Performance Considerations

1. **Storage**: Use signed URLs for client-side uploads to avoid proxying large files
2. **Transcription**: Whisper can take 30-60 seconds for a 1-hour podcast
3. **Chunking**: Very fast, processes 1000s of segments in milliseconds
4. **Export**: FFmpeg processing time depends on audio length and complexity

## Future Improvements

- [ ] Add support for speaker diarization
- [ ] Implement audio quality analysis
- [ ] Add support for multiple audio formats (M4A, OGG, etc.)
- [ ] Implement parallel chunk processing
- [ ] Add progress callbacks for long operations
- [ ] Support for audio normalization and enhancement

## License

Part of the AutoPodcast Editor project.
