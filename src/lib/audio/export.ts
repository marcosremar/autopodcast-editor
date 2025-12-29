import { PassThrough } from 'stream';
import { AudioChunk } from './chunking';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpeg = require('fluent-ffmpeg');

export interface ExportOptions {
  outputFormat?: 'mp3' | 'wav' | 'aac' | 'ogg';
  bitrate?: string; // e.g., '128k', '192k', '320k'
  sampleRate?: number; // e.g., 44100, 48000
  channels?: number; // 1 for mono, 2 for stereo
}

export interface SegmentExportOptions {
  inputPath: string;
  startTime: number; // seconds
  endTime: number; // seconds
  outputFormat?: 'mp3' | 'wav' | 'aac' | 'ogg';
}

export interface ConcatenateOptions {
  segments: {
    path: string;
    startTime?: number;
    endTime?: number;
  }[];
  crossfadeDuration?: number; // seconds, default 0.5
  outputFormat?: 'mp3' | 'wav' | 'aac' | 'ogg';
  bitrate?: string;
}

export interface ExportService {
  extractSegment(options: SegmentExportOptions): Promise<Buffer>;
  concatenateSegments(options: ConcatenateOptions): Promise<Buffer>;
  extractChunks(inputPath: string, chunks: AudioChunk[], exportOptions?: ExportOptions): Promise<Buffer[]>;
}

export class FFmpegExportService implements ExportService {
  /**
   * Extracts a segment from an audio file
   */
  async extractSegment(options: SegmentExportOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = new PassThrough();

      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);

      const command = ffmpeg(options.inputPath)
        .setStartTime(options.startTime)
        .setDuration(options.endTime - options.startTime)
        .audioCodec(this.getCodec(options.outputFormat || 'mp3'))
        .format(options.outputFormat || 'mp3')
        .on('error', reject);

      command.pipe(stream, { end: true });
    });
  }

  /**
   * Concatenates multiple audio segments with optional crossfade
   */
  async concatenateSegments(options: ConcatenateOptions): Promise<Buffer> {
    if (options.segments.length === 0) {
      throw new Error('No segments to concatenate');
    }

    if (options.segments.length === 1) {
      // If only one segment, just extract it
      const segment = options.segments[0];
      return this.extractSegment({
        inputPath: segment.path,
        startTime: segment.startTime || 0,
        endTime: segment.endTime || 0,
        outputFormat: options.outputFormat,
      });
    }

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = new PassThrough();

      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);

      const crossfade = options.crossfadeDuration || 0.5;
      const hasMultipleSources = new Set(options.segments.map(s => s.path)).size > 1;

      if (!hasMultipleSources || crossfade === 0) {
        // Simple concatenation without crossfade
        this.simpleConcatenate(options, stream, reject);
      } else {
        // Concatenation with crossfade
        this.crossfadeConcatenate(options, stream, reject, crossfade);
      }
    });
  }

  /**
   * Extracts multiple chunks from a single audio file
   */
  async extractChunks(
    inputPath: string,
    chunks: AudioChunk[],
    exportOptions: ExportOptions = {}
  ): Promise<Buffer[]> {
    const promises = chunks.map(chunk =>
      this.extractSegment({
        inputPath,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        outputFormat: exportOptions.outputFormat || 'mp3',
      })
    );

    return Promise.all(promises);
  }

  private simpleConcatenate(
    options: ConcatenateOptions,
    stream: PassThrough,
    reject: (error: Error) => void
  ): void {
    const command = ffmpeg();

    // Add all segments as inputs
    options.segments.forEach(segment => {
      const input = command.input(segment.path);
      if (segment.startTime !== undefined && segment.endTime !== undefined) {
        input.setStartTime(segment.startTime);
        input.setDuration(segment.endTime - segment.startTime);
      }
    });

    // Create filter complex for concatenation
    const filterComplex = options.segments
      .map((_, i) => `[${i}:a]`)
      .join('') + `concat=n=${options.segments.length}:v=0:a=1[out]`;

    command
      .complexFilter(filterComplex)
      .outputOptions(['-map', '[out]'])
      .audioCodec(this.getCodec(options.outputFormat || 'mp3'))
      .format(options.outputFormat || 'mp3');

    if (options.bitrate) {
      command.audioBitrate(options.bitrate);
    }

    command.on('error', reject);
    command.pipe(stream, { end: true });
  }

  private crossfadeConcatenate(
    options: ConcatenateOptions,
    stream: PassThrough,
    reject: (error: Error) => void,
    crossfade: number
  ): void {
    const command = ffmpeg();

    // Add all segments as inputs
    options.segments.forEach(segment => {
      const input = command.input(segment.path);
      if (segment.startTime !== undefined && segment.endTime !== undefined) {
        input.setStartTime(segment.startTime);
        input.setDuration(segment.endTime - segment.startTime);
      }
    });

    // Build complex filter for crossfading
    let filterComplex = '';
    let previousOutput = '[0:a]';

    for (let i = 1; i < options.segments.length; i++) {
      const currentInput = `[${i}:a]`;
      const outputLabel = i === options.segments.length - 1 ? '[out]' : `[a${i}]`;

      filterComplex += `${previousOutput}${currentInput}acrossfade=d=${crossfade}:c1=tri:c2=tri${outputLabel};`;
      previousOutput = outputLabel;
    }

    // Remove trailing semicolon
    filterComplex = filterComplex.slice(0, -1);

    command
      .complexFilter(filterComplex)
      .outputOptions(['-map', '[out]'])
      .audioCodec(this.getCodec(options.outputFormat || 'mp3'))
      .format(options.outputFormat || 'mp3');

    if (options.bitrate) {
      command.audioBitrate(options.bitrate);
    }

    command.on('error', reject);
    command.pipe(stream, { end: true });
  }

  private getCodec(format: string): string {
    const codecs: Record<string, string> = {
      mp3: 'libmp3lame',
      wav: 'pcm_s16le',
      aac: 'aac',
      ogg: 'libvorbis',
    };
    return codecs[format] || 'libmp3lame';
  }
}

export class MockExportService implements ExportService {
  private mockData: Map<string, Buffer> = new Map();

  constructor() {
    // Initialize with some mock data
    this.mockData.set('default', Buffer.from('mock-audio-data'));
  }

  async extractSegment(options: SegmentExportOptions): Promise<Buffer> {
    // Simulate processing delay
    await this.delay(100);

    const duration = options.endTime - options.startTime;
    const mockData = Buffer.from(
      `mock-segment-${options.inputPath}-${options.startTime}-${options.endTime}-${duration}s`
    );

    return mockData;
  }

  async concatenateSegments(options: ConcatenateOptions): Promise<Buffer> {
    // Simulate processing delay
    await this.delay(200);

    const segmentDescriptions = options.segments
      .map(s => `${s.path}:${s.startTime || 0}-${s.endTime || 'end'}`)
      .join('|');

    const mockData = Buffer.from(
      `mock-concatenated-${segmentDescriptions}-crossfade:${options.crossfadeDuration || 0}s`
    );

    return mockData;
  }

  async extractChunks(
    inputPath: string,
    chunks: AudioChunk[],
    exportOptions: ExportOptions = {}
  ): Promise<Buffer[]> {
    // Simulate processing delay
    await this.delay(150);

    return chunks.map(chunk =>
      Buffer.from(
        `mock-chunk-${chunk.id}-${inputPath}-${chunk.startTime}-${chunk.endTime}-${exportOptions.outputFormat || 'mp3'}`
      )
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper methods for testing
  setMockData(key: string, data: Buffer): void {
    this.mockData.set(key, data);
  }

  getMockData(key: string): Buffer | undefined {
    return this.mockData.get(key);
  }
}

// Factory function to create export service
export function createExportService(useMock = false): ExportService {
  if (useMock) {
    return new MockExportService();
  }

  return new FFmpegExportService();
}
