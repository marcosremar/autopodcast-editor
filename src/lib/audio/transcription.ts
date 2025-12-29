import Replicate from 'replicate';

export interface TranscriptionSegment {
  id: number;
  start: number; // seconds
  end: number; // seconds
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language?: string;
  duration?: number;
}

export interface TranscriptionOptions {
  audioUrl: string;
  language?: string; // e.g., 'en', 'es', 'fr' - leave undefined for auto-detect
  prompt?: string; // Optional prompt to guide transcription
}

export interface TranscriptionService {
  transcribe(options: TranscriptionOptions): Promise<TranscriptionResult>;
}

export class ReplicateTranscriptionService implements TranscriptionService {
  private client: Replicate;
  private model: string;

  constructor(apiToken: string, model?: string) {
    this.client = new Replicate({
      auth: apiToken,
    });
    this.model = model || 'openai/whisper:4d50797290df275329f202e48c76360b3f22b08d28c196cbc54600319435f8d2';
  }

  async transcribe(options: TranscriptionOptions): Promise<TranscriptionResult> {
    try {
      const input: Record<string, any> = {
        audio: options.audioUrl,
        model: 'large-v3',
        temperature: 0,
        // Return segments with timestamps
        transcription: 'srt', // Request SRT format for detailed segments
      };

      if (options.language) {
        input.language = options.language;
      }

      if (options.prompt) {
        input.prompt = options.prompt;
      }

      const output = await this.client.run(this.model as any, { input }) as any;

      // Parse the output
      // Whisper on Replicate typically returns an object with transcription and segments
      const transcription = this.parseWhisperOutput(output);

      return transcription;
    } catch (error) {
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseWhisperOutput(output: any): TranscriptionResult {
    // Handle different output formats from Replicate Whisper
    if (typeof output === 'string') {
      // If output is a string, parse it as SRT or plain text
      return this.parseSRT(output);
    }

    if (output && typeof output === 'object') {
      // If output has segments property
      if (output.segments && Array.isArray(output.segments)) {
        return {
          text: output.text || output.segments.map((s: any) => s.text).join(' '),
          segments: output.segments.map((segment: any, index: number) => ({
            id: segment.id || index,
            start: segment.start || 0,
            end: segment.end || 0,
            text: segment.text || '',
          })),
          language: output.language,
          duration: output.duration,
        };
      }

      // If output has transcription property
      if (output.transcription) {
        return this.parseSRT(output.transcription);
      }
    }

    // Fallback: treat as plain text
    const text = String(output);
    return {
      text,
      segments: [{
        id: 0,
        start: 0,
        end: 0,
        text,
      }],
    };
  }

  private parseSRT(srt: string): TranscriptionResult {
    const segments: TranscriptionSegment[] = [];
    const blocks = srt.trim().split(/\n\n+/);
    let fullText = '';

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length < 3) continue;

      const id = parseInt(lines[0], 10);
      const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);

      if (!timeMatch) continue;

      const start = this.parseTimestamp(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
      const end = this.parseTimestamp(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
      const text = lines.slice(2).join('\n').trim();

      segments.push({ id, start, end, text });
      fullText += (fullText ? ' ' : '') + text;
    }

    return {
      text: fullText,
      segments,
      duration: segments.length > 0 ? segments[segments.length - 1].end : 0,
    };
  }

  private parseTimestamp(hours: string, minutes: string, seconds: string, milliseconds: string): number {
    return (
      parseInt(hours, 10) * 3600 +
      parseInt(minutes, 10) * 60 +
      parseInt(seconds, 10) +
      parseInt(milliseconds, 10) / 1000
    );
  }
}

export class MockTranscriptionService implements TranscriptionService {
  private delay: number;

  constructor(delay = 0) {
    this.delay = delay;
  }

  async transcribe(options: TranscriptionOptions): Promise<TranscriptionResult> {
    // Simulate API delay
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    // Generate mock transcription based on URL
    const mockText = this.generateMockText(options.audioUrl);
    const segments = this.generateMockSegments(mockText);

    return {
      text: mockText,
      segments,
      language: options.language || 'en',
      duration: segments.length > 0 ? segments[segments.length - 1].end : 0,
    };
  }

  private generateMockText(audioUrl: string): string {
    return `This is a mock transcription for ${audioUrl}. The audio contains sample content with multiple sentences. Each sentence represents a segment of the audio file. This helps in testing the transcription functionality without making actual API calls.`;
  }

  private generateMockSegments(text: string): TranscriptionSegment[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const segments: TranscriptionSegment[] = [];
    let currentTime = 0;

    sentences.forEach((sentence, index) => {
      const duration = 3 + Math.random() * 4; // 3-7 seconds per sentence
      segments.push({
        id: index,
        start: currentTime,
        end: currentTime + duration,
        text: sentence.trim(),
      });
      currentTime += duration;
    });

    return segments;
  }
}

// Factory function to create transcription service
export function createTranscriptionService(useMock = false): TranscriptionService {
  if (useMock) {
    return new MockTranscriptionService(1000); // 1 second delay for testing
  }

  const apiToken = process.env.REPLICATE_API_TOKEN;

  if (!apiToken) {
    throw new Error('Missing REPLICATE_API_TOKEN environment variable');
  }

  return new ReplicateTranscriptionService(apiToken);
}
