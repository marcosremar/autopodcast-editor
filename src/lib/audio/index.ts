/**
 * Audio Processing Infrastructure
 *
 * This module provides the core infrastructure for audio processing in the AeroPod editor:
 * - Storage: S3-compatible storage for audio files
 * - Transcription: Whisper-based transcription via Replicate
 * - Chunking: Smart segmentation of transcriptions into 30-60 second chunks
 * - Export: FFmpeg-based audio export and concatenation
 */

export {
  type TranscriptionSegment,
  type TranscriptionResult,
  type TranscriptionOptions,
  type TranscriptionService,
  ReplicateTranscriptionService,
  MockTranscriptionService,
  createTranscriptionService,
} from './transcription';

export {
  type AudioChunk,
  type ChunkingOptions,
  chunkTranscription,
  mergeChunks,
  splitChunkAtTime,
  validateChunks,
} from './chunking';

export {
  type ExportOptions,
  type SegmentExportOptions,
  type ConcatenateOptions,
  type ExportService,
  FFmpegExportService,
  MockExportService,
  createExportService,
} from './export';

export { MockStorageClient } from '../storage/s3';
