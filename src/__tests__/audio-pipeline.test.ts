import { describe, it, expect, beforeEach } from 'vitest';
import {
  MockStorageClient,
  MockTranscriptionService,
  MockExportService,
  chunkTranscription,
  mergeChunks,
  splitChunkAtTime,
  validateChunks,
} from '@/lib/audio';
import type { TranscriptionSegment } from '@/lib/audio';

describe('Audio Processing Pipeline', () => {
  describe('Storage', () => {
    let storage: MockStorageClient;

    beforeEach(() => {
      storage = new MockStorageClient();
    });

    it('should upload and download files', async () => {
      const testData = Buffer.from('test audio data');
      const key = 'test-audio.mp3';

      // Upload
      const uploadResult = await storage.upload({
        key,
        body: testData,
        contentType: 'audio/mpeg',
      });

      expect(uploadResult.key).toBe(key);
      expect(uploadResult.url).toContain(key);

      // Download
      const downloadedData = await storage.download({ key });
      expect(downloadedData).toEqual(testData);
    });

    it('should generate signed URLs', async () => {
      const key = 'test-audio.mp3';
      await storage.upload({
        key,
        body: Buffer.from('test'),
        contentType: 'audio/mpeg',
      });

      const url = await storage.getSignedUrl({ key, expiresIn: 3600 });
      expect(url).toContain(key);
      expect(url).toContain('signed=true');
    });
  });

  describe('Transcription', () => {
    let transcriptionService: MockTranscriptionService;

    beforeEach(() => {
      transcriptionService = new MockTranscriptionService(0);
    });

    it('should transcribe audio', async () => {
      const result = await transcriptionService.transcribe({
        audioUrl: 'https://example.com/audio.mp3',
      });

      expect(result.text).toBeTruthy();
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.language).toBe('en');
    });

    it('should include timestamps in segments', async () => {
      const result = await transcriptionService.transcribe({
        audioUrl: 'https://example.com/audio.mp3',
      });

      result.segments.forEach((segment, index) => {
        expect(segment.id).toBe(index);
        expect(segment.start).toBeLessThan(segment.end);
        expect(segment.text).toBeTruthy();
      });
    });
  });

  describe('Chunking', () => {
    const createMockSegments = (): TranscriptionSegment[] => [
      { id: 0, start: 0, end: 5, text: 'First sentence.' },
      { id: 1, start: 5, end: 10, text: 'Second sentence.' },
      { id: 2, start: 10, end: 15, text: 'Third sentence.' },
      { id: 3, start: 15, end: 50, text: 'Fourth sentence that is long.' },
      { id: 4, start: 50, end: 55, text: 'Fifth sentence.' },
      { id: 5, start: 55, end: 90, text: 'Sixth sentence.' },
      { id: 6, start: 90, end: 95, text: 'Seventh sentence.' },
    ];

    it('should create chunks from segments', () => {
      const segments = createMockSegments();
      const chunks = chunkTranscription(segments);

      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach(chunk => {
        expect(chunk.id).toBeTruthy();
        expect(chunk.startTime).toBeLessThan(chunk.endTime);
        expect(chunk.text).toBeTruthy();
        expect(chunk.segmentIds.length).toBeGreaterThan(0);
      });
    });

    it('should respect duration constraints', () => {
      const segments = createMockSegments();
      const chunks = chunkTranscription(segments, {
        minDuration: 30,
        maxDuration: 60,
      });

      chunks.forEach(chunk => {
        const duration = chunk.endTime - chunk.startTime;
        // Last chunk might be shorter than minDuration
        if (chunk.id !== chunks[chunks.length - 1].id) {
          expect(duration).toBeGreaterThanOrEqual(30);
        }
        expect(duration).toBeLessThanOrEqual(60);
      });
    });

    it('should merge chunks', () => {
      const segments = createMockSegments();
      const chunks = chunkTranscription(segments);

      const merged = mergeChunks(chunks);
      expect(merged).toBeTruthy();
      if (merged) {
        expect(merged.startTime).toBe(chunks[0].startTime);
        expect(merged.endTime).toBe(chunks[chunks.length - 1].endTime);
        expect(merged.segmentIds.length).toBe(
          chunks.reduce((sum, c) => sum + c.segmentIds.length, 0)
        );
      }
    });

    it('should split chunks at time', () => {
      const segments = createMockSegments();
      const chunks = chunkTranscription(segments);
      const firstChunk = chunks[0];

      const splitTime = (firstChunk.startTime + firstChunk.endTime) / 2;
      const split = splitChunkAtTime(firstChunk, segments, splitTime);

      if (split) {
        const [part1, part2] = split;
        expect(part1.startTime).toBe(firstChunk.startTime);
        expect(part2.endTime).toBe(firstChunk.endTime);
        expect(part1.endTime).toBeLessThanOrEqual(part2.startTime);
      }
    });

    it('should validate chunks', () => {
      const segments = createMockSegments();
      const chunks = chunkTranscription(segments);

      expect(validateChunks(chunks)).toBe(true);

      // Create invalid chunks
      const invalidChunks = [
        { id: '1', startTime: 0, endTime: 10, text: 'Test', segmentIds: [0] },
        { id: '2', startTime: 5, endTime: 15, text: 'Test', segmentIds: [1] }, // Overlaps
      ];

      expect(validateChunks(invalidChunks)).toBe(false);
    });
  });

  describe('Export', () => {
    let exportService: MockExportService;

    beforeEach(() => {
      exportService = new MockExportService();
    });

    it('should extract audio segments', async () => {
      const result = await exportService.extractSegment({
        inputPath: '/path/to/audio.mp3',
        startTime: 10,
        endTime: 30,
        outputFormat: 'mp3',
      });

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should concatenate segments', async () => {
      const result = await exportService.concatenateSegments({
        segments: [
          { path: '/path/to/audio1.mp3', startTime: 0, endTime: 10 },
          { path: '/path/to/audio2.mp3', startTime: 0, endTime: 10 },
        ],
        crossfadeDuration: 0.5,
        outputFormat: 'mp3',
      });

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should extract multiple chunks', async () => {
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 0, end: 30, text: 'First chunk' },
        { id: 1, start: 30, end: 60, text: 'Second chunk' },
      ];

      const chunks = chunkTranscription(segments);
      const results = await exportService.extractChunks(
        '/path/to/audio.mp3',
        chunks,
        { outputFormat: 'mp3' }
      );

      expect(results.length).toBe(chunks.length);
      results.forEach(result => {
        expect(Buffer.isBuffer(result)).toBe(true);
      });
    });
  });

  describe('Integration', () => {
    it('should process full audio pipeline', async () => {
      // 1. Upload audio to storage
      const storage = new MockStorageClient();
      const audioData = Buffer.from('mock audio data');
      const uploadResult = await storage.upload({
        key: 'test-audio.mp3',
        body: audioData,
        contentType: 'audio/mpeg',
      });

      // 2. Transcribe audio
      const transcriptionService = new MockTranscriptionService(0);
      const transcription = await transcriptionService.transcribe({
        audioUrl: uploadResult.url,
      });

      expect(transcription.segments.length).toBeGreaterThan(0);

      // 3. Chunk transcription
      const chunks = chunkTranscription(transcription.segments, {
        minDuration: 30,
        maxDuration: 60,
      });

      expect(chunks.length).toBeGreaterThan(0);
      expect(validateChunks(chunks)).toBe(true);

      // 4. Export chunks
      const exportService = new MockExportService();
      const exportedChunks = await exportService.extractChunks(
        'test-audio.mp3',
        chunks
      );

      expect(exportedChunks.length).toBe(chunks.length);
    });
  });
});
