import Replicate from 'replicate';
import Groq from 'groq-sdk';
import {
  transcribeFromUrl as crisperWhisperTranscribe,
  type CrisperWhisperResult,
  type DetectedFiller
} from '@/services/crisper-whisper';
import {
  transcribeWithDeepgram,
  isDeepgramConfigured,
  type DeepgramResult,
} from '@/services/deepgram';

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  is_filler?: boolean;
}

export interface TranscriptionSegment {
  id: number;
  start: number; // seconds
  end: number; // seconds
  text: string;
  words?: WordTimestamp[]; // Word-level timestamps
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language?: string;
  duration?: number;
  fillers?: DetectedFiller[];
  filler_count?: number;
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

export class GroqTranscriptionService implements TranscriptionService {
  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey });
  }

  async transcribe(options: TranscriptionOptions): Promise<TranscriptionResult> {
    try {
      // For Groq, we need the actual file, not a URL
      // This service expects audioUrl to be a local file path or base64 data
      const audioData = await this.fetchAudioData(options.audioUrl);

      const transcription = await this.client.audio.transcriptions.create({
        file: new File([new Uint8Array(audioData)], 'audio.mp3', { type: 'audio/mpeg' }),
        model: 'whisper-large-v3',
        response_format: 'verbose_json',
        language: options.language || 'pt',
        timestamp_granularities: ['word', 'segment'], // Enable word-level timestamps
      });

      // Parse Groq response with word timestamps
      const groqResult = transcription as unknown as {
        text: string;
        segments: Array<{
          start: number;
          end: number;
          text: string;
        }>;
        words?: Array<{
          word: string;
          start: number;
          end: number;
        }>;
        language?: string;
        duration?: number;
      };

      // Build word map for each segment
      const words = groqResult.words || [];

      const segments: TranscriptionSegment[] = (groqResult.segments || []).map((s, index) => {
        // Find words that belong to this segment
        const segmentWords: WordTimestamp[] = words
          .filter(w => w.start >= s.start && w.end <= s.end)
          .map(w => ({
            word: w.word,
            start: Math.round(w.start * 100) / 100,
            end: Math.round(w.end * 100) / 100,
          }));

        return {
          id: index,
          start: Math.round(s.start * 100) / 100,
          end: Math.round(s.end * 100) / 100,
          text: s.text.trim(),
          words: segmentWords.length > 0 ? segmentWords : undefined,
        };
      });

      return {
        text: groqResult.text || transcription.text,
        segments,
        language: groqResult.language || options.language,
        duration: groqResult.duration || (segments.length > 0 ? segments[segments.length - 1].end : 0),
      };
    } catch (error) {
      throw new Error(`Groq transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchAudioData(audioUrl: string): Promise<Buffer> {
    // If it's a data URL or base64
    if (audioUrl.startsWith('data:')) {
      const base64 = audioUrl.split(',')[1];
      return Buffer.from(base64, 'base64');
    }

    // If it's a local file path
    if (audioUrl.startsWith('/') || audioUrl.startsWith('file://')) {
      const fs = await import('fs');
      const path = audioUrl.replace('file://', '');
      return fs.readFileSync(path);
    }

    // If it's a remote URL, fetch it
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

/**
 * CrisperWhisper Transcription Service
 * Uses CrisperWhisper for verbatim transcription with filler detection
 * Provides better filler word detection than standard Whisper
 */
export class CrisperWhisperTranscriptionService implements TranscriptionService {
  private language: "pt" | "en" | "es";

  constructor(language: "pt" | "en" | "es" = "pt") {
    this.language = language;
  }

  async transcribe(options: TranscriptionOptions): Promise<TranscriptionResult> {
    try {
      console.log('[CrisperWhisper] Starting transcription...');

      // Map language codes to CrisperWhisper format
      const langMap: Record<string, "pt" | "en" | "es"> = {
        'pt': 'pt',
        'pt-BR': 'pt',
        'portuguese': 'pt',
        'en': 'en',
        'english': 'en',
        'es': 'es',
        'spanish': 'es',
      };

      const language = options.language
        ? langMap[options.language] || this.language
        : this.language;

      const result = await crisperWhisperTranscribe(options.audioUrl, language);

      if (!result.success) {
        throw new Error(result.error || 'CrisperWhisper transcription failed');
      }

      // Convert CrisperWhisper segments to TranscriptionSegment format
      const segments: TranscriptionSegment[] = (result.segments || []).map((segment, index) => ({
        id: index,
        start: segment.start,
        end: segment.end,
        text: segment.text,
        words: segment.words?.map(w => ({
          word: w.word,
          start: w.start,
          end: w.end,
          is_filler: w.is_filler,
        })),
      }));

      console.log(`[CrisperWhisper] Transcription complete: ${result.filler_count || 0} fillers detected`);

      return {
        text: result.text || '',
        segments,
        language: result.language,
        duration: result.duration,
        fillers: result.fillers,
        filler_count: result.filler_count,
      };
    } catch (error) {
      console.error('[CrisperWhisper] Error:', error);
      throw new Error(`CrisperWhisper transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Deepgram Transcription Service
 * Uses Deepgram Nova for transcription with native filler detection
 * Supports Portuguese, English, Spanish and many other languages
 * Has filler_words=true parameter for automatic filler detection
 */
export class DeepgramTranscriptionService implements TranscriptionService {
  private language: string;

  constructor(language: string = 'pt-BR') {
    this.language = language;
  }

  async transcribe(options: TranscriptionOptions): Promise<TranscriptionResult> {
    try {
      console.log('[Deepgram] Starting transcription...');

      const language = options.language || this.language;

      const result = await transcribeWithDeepgram(options.audioUrl, {
        language,
        detectFillers: true,
        model: 'nova-2',
      });

      if (!result.success) {
        throw new Error(result.error || 'Deepgram transcription failed');
      }

      // Convert Deepgram segments to TranscriptionSegment format
      const segments: TranscriptionSegment[] = (result.segments || []).map((segment, index) => ({
        id: index,
        start: segment.start,
        end: segment.end,
        text: segment.text,
        words: segment.words?.map(w => ({
          word: w.word,
          start: w.start,
          end: w.end,
          is_filler: result.fillers?.some(f => f.start === w.start && f.end === w.end),
        })),
      }));

      console.log(`[Deepgram] Transcription complete: ${result.filler_count || 0} fillers detected`);

      return {
        text: result.text || '',
        segments,
        language: result.language,
        duration: result.duration,
        fillers: result.fillers,
        filler_count: result.filler_count,
      };
    } catch (error) {
      console.error('[Deepgram] Error:', error);
      throw new Error(`Deepgram transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
export function createTranscriptionService(useMock = false, language?: string): TranscriptionService {
  if (useMock) {
    return new MockTranscriptionService(1000); // 1 second delay for testing
  }

  // Priority order:
  // 1. Deepgram (best for filler detection in Portuguese/Spanish/English)
  // 2. CrisperWhisper (only for English/German)
  // 3. Groq Whisper (fast, cheap, no native filler detection)
  // 4. Replicate Whisper (fallback)

  // Check if Deepgram is configured (preferred for filler detection)
  const useDeepgram = process.env.USE_DEEPGRAM === 'true';
  if (useDeepgram && isDeepgramConfigured()) {
    console.log('[Transcription] Using Deepgram Nova (with native filler detection)');
    return new DeepgramTranscriptionService(language || 'pt-BR');
  }

  // Check if CrisperWhisper is enabled (only for English/German)
  const useCrisperWhisper = process.env.USE_CRISPER_WHISPER === 'true';
  if (useCrisperWhisper) {
    // CrisperWhisper only supports EN/DE
    const lang = language?.toLowerCase().split('-')[0] || 'en';
    if (lang === 'en' || lang === 'de') {
      console.log('[Transcription] Using CrisperWhisper (verbatim transcription with filler detection)');
      return new CrisperWhisperTranscriptionService(lang as "pt" | "en" | "es");
    } else {
      console.log('[Transcription] CrisperWhisper enabled but language not supported, falling back...');
    }
  }

  // Prefer Groq over Replicate (faster and cheaper)
  const groqApiKey = process.env.GROQ_API_KEY;
  if (groqApiKey) {
    console.log('[Transcription] Using Groq Whisper');
    return new GroqTranscriptionService(groqApiKey);
  }

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (replicateToken) {
    console.log('[Transcription] Using Replicate Whisper');
    return new ReplicateTranscriptionService(replicateToken);
  }

  throw new Error('Missing GROQ_API_KEY or REPLICATE_API_TOKEN environment variable');
}

// Create CrisperWhisper service specifically for filler detection
export function createCrisperWhisperService(language: "pt" | "en" | "es" = "pt"): CrisperWhisperTranscriptionService {
  return new CrisperWhisperTranscriptionService(language);
}
