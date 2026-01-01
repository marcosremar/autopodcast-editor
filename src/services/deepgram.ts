/**
 * Deepgram Transcription Service
 *
 * Uses Deepgram Nova-3 for transcription with native filler word detection.
 * Supports Portuguese (PT-BR) with filler_words=true parameter.
 *
 * Pricing: ~$0.0077/min (streaming) or ~$0.0043/min (pre-recorded)
 * Free tier: $150 credits
 *
 * Docs: https://developers.deepgram.com/docs/filler-words
 */

import { createClient, DeepgramClient } from '@deepgram/sdk';

export interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
}

export interface DeepgramSegment {
  text: string;
  start: number;
  end: number;
  words: DeepgramWord[];
}

export interface DeepgramResult {
  success: boolean;
  text?: string;
  segments?: DeepgramSegment[];
  words?: DeepgramWord[];
  fillers?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  filler_count?: number;
  language?: string;
  duration?: number;
  error?: string;
}

// Common filler words in different languages
const FILLER_PATTERNS: Record<string, string[]> = {
  pt: ['hum', 'eh', 'ah', 'uhm', 'uh', 'um', 'é', 'né', 'tipo', 'assim', 'então', 'quer dizer', 'basicamente', 'na verdade', 'enfim', 'aham', 'hmm', 'eee'],
  en: ['um', 'uh', 'uhm', 'like', 'you know', 'basically', 'actually', 'so', 'literally', 'right', 'i mean', 'hmm', 'ah'],
  es: ['eh', 'este', 'pues', 'bueno', 'o sea', 'como', 'digamos', 'verdad'],
};

/**
 * Check if a word is a filler based on language
 */
function isFiller(word: string, language: string): boolean {
  const lang = language.split('-')[0].toLowerCase(); // pt-BR -> pt
  const fillers = FILLER_PATTERNS[lang] || FILLER_PATTERNS['en'];
  const normalizedWord = word.toLowerCase().trim();
  return fillers.includes(normalizedWord);
}

/**
 * Transcribe audio using Deepgram
 */
export async function transcribeWithDeepgram(
  audioUrl: string,
  options: {
    language?: string;
    detectFillers?: boolean;
    model?: 'nova-2' | 'nova-3';
  } = {}
): Promise<DeepgramResult> {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'DEEPGRAM_API_KEY not configured',
    };
  }

  const {
    language = 'pt-BR',
    detectFillers = true,
    model = 'nova-2',
  } = options;

  try {
    console.log(`[Deepgram] Starting transcription with ${model}...`);
    console.log(`[Deepgram] Language: ${language}, Filler detection: ${detectFillers}`);

    const deepgram = createClient(apiKey);

    // Fetch audio if it's a local file path
    let audioSource: { url: string } | { buffer: Buffer; mimetype: string };

    if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
      audioSource = { url: audioUrl };
    } else {
      // Local file - read and send as buffer
      const fs = await import('fs');
      const path = await import('path');

      let filePath = audioUrl;
      if (audioUrl.startsWith('/uploads/')) {
        filePath = path.join(process.cwd(), 'public', audioUrl);
      }

      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.m4a': 'audio/mp4',
        '.ogg': 'audio/ogg',
        '.flac': 'audio/flac',
      };

      audioSource = {
        buffer,
        mimetype: mimeTypes[ext] || 'audio/mpeg',
      };
    }

    // Transcribe with Deepgram
    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
      audioSource as { url: string },
      {
        model: model,
        language: language,
        smart_format: true,
        punctuate: true,
        paragraphs: true,
        utterances: true,
        filler_words: detectFillers, // This enables filler detection!
        diarize: false,
      }
    );

    if (error) {
      console.error('[Deepgram] API error:', error);
      return {
        success: false,
        error: `Deepgram API error: ${error.message}`,
      };
    }

    if (!result || !result.results) {
      return {
        success: false,
        error: 'No transcription result returned',
      };
    }

    // Parse response
    const channel = result.results.channels[0];
    const alternative = channel?.alternatives[0];

    if (!alternative) {
      return {
        success: false,
        error: 'No transcription alternative found',
      };
    }

    const text = alternative.transcript || '';
    const words = alternative.words || [];
    const duration = result.metadata?.duration || 0;

    // Build segments from paragraphs or utterances
    const segments: DeepgramSegment[] = [];
    const paragraphs = alternative.paragraphs?.paragraphs || [];

    if (paragraphs.length > 0) {
      for (const para of paragraphs) {
        for (const sentence of para.sentences || []) {
          const segmentWords = words.filter(
            (w: any) => w.start >= sentence.start && w.end <= sentence.end
          );

          segments.push({
            text: sentence.text,
            start: sentence.start,
            end: sentence.end,
            words: segmentWords.map((w: any) => ({
              word: w.word,
              start: w.start,
              end: w.end,
              confidence: w.confidence,
              punctuated_word: w.punctuated_word,
            })),
          });
        }
      }
    } else {
      // Fallback: create segments from words (group by ~30 seconds)
      let currentSegment: DeepgramSegment = { text: '', start: 0, end: 0, words: [] };
      const segmentDuration = 30;

      for (const w of words) {
        if (currentSegment.text === '') {
          currentSegment.start = w.start;
        }

        currentSegment.text += (currentSegment.text ? ' ' : '') + w.word;
        currentSegment.end = w.end;
        currentSegment.words.push({
          word: w.word,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
          punctuated_word: w.punctuated_word,
        });

        if (w.end - currentSegment.start >= segmentDuration) {
          segments.push(currentSegment);
          currentSegment = { text: '', start: 0, end: 0, words: [] };
        }
      }

      if (currentSegment.text) {
        segments.push(currentSegment);
      }
    }

    // Detect fillers from words
    const fillers: Array<{ word: string; start: number; end: number; confidence: number }> = [];
    const langCode = language.split('-')[0].toLowerCase();

    for (const w of words) {
      if (isFiller(w.word, langCode)) {
        fillers.push({
          word: w.word,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
        });
      }
    }

    console.log(`[Deepgram] Transcription complete: ${words.length} words, ${fillers.length} fillers detected`);

    return {
      success: true,
      text,
      segments,
      words: words.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
        punctuated_word: w.punctuated_word,
      })),
      fillers,
      filler_count: fillers.length,
      language,
      duration,
    };
  } catch (error) {
    console.error('[Deepgram] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Transcribe from base64 audio
 */
export async function transcribeFromBase64(
  audioBase64: string,
  mimeType: string = 'audio/mpeg',
  options: {
    language?: string;
    detectFillers?: boolean;
    model?: 'nova-2' | 'nova-3';
  } = {}
): Promise<DeepgramResult> {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'DEEPGRAM_API_KEY not configured',
    };
  }

  const {
    language = 'pt-BR',
    detectFillers = true,
    model = 'nova-2',
  } = options;

  try {
    console.log(`[Deepgram] Starting transcription from base64 with ${model}...`);

    const deepgram = createClient(apiKey);
    const buffer = Buffer.from(audioBase64, 'base64');

    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      buffer,
      {
        model: model,
        language: language,
        smart_format: true,
        punctuate: true,
        paragraphs: true,
        utterances: true,
        filler_words: detectFillers,
        diarize: false,
        mimetype: mimeType,
      }
    );

    if (error) {
      console.error('[Deepgram] API error:', error);
      return {
        success: false,
        error: `Deepgram API error: ${error.message}`,
      };
    }

    // Parse same as URL transcription
    const channel = result?.results?.channels[0];
    const alternative = channel?.alternatives[0];

    if (!alternative) {
      return {
        success: false,
        error: 'No transcription alternative found',
      };
    }

    const text = alternative.transcript || '';
    const words = alternative.words || [];
    const duration = result?.metadata?.duration || 0;

    // Detect fillers
    const fillers: Array<{ word: string; start: number; end: number; confidence: number }> = [];
    const langCode = language.split('-')[0].toLowerCase();

    for (const w of words) {
      if (isFiller(w.word, langCode)) {
        fillers.push({
          word: w.word,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
        });
      }
    }

    console.log(`[Deepgram] Transcription complete: ${words.length} words, ${fillers.length} fillers`);

    return {
      success: true,
      text,
      segments: [],
      words: words.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
      })),
      fillers,
      filler_count: fillers.length,
      language,
      duration,
    };
  } catch (error) {
    console.error('[Deepgram] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if Deepgram is configured
 */
export function isDeepgramConfigured(): boolean {
  return !!process.env.DEEPGRAM_API_KEY;
}

/**
 * Get filler statistics from result
 */
export function getFillerStats(result: DeepgramResult): {
  totalCount: number;
  totalDuration: number;
  byType: Record<string, { count: number; duration: number }>;
} {
  const fillers = result.fillers || [];
  const byType: Record<string, { count: number; duration: number }> = {};

  for (const filler of fillers) {
    const word = filler.word.toLowerCase();
    if (!byType[word]) {
      byType[word] = { count: 0, duration: 0 };
    }
    byType[word].count++;
    byType[word].duration += filler.end - filler.start;
  }

  return {
    totalCount: fillers.length,
    totalDuration: fillers.reduce((sum, f) => sum + (f.end - f.start), 0),
    byType,
  };
}

export default {
  transcribe: transcribeWithDeepgram,
  transcribeFromBase64,
  isConfigured: isDeepgramConfigured,
  getFillerStats,
};
