/**
 * CrisperWhisper Service
 * Abstraction layer for CrisperWhisper transcription with filler detection
 *
 * CrisperWhisper is a verbatim transcription model that:
 * - Transcribes everything including fillers (um, uh, eh, tipo, etc)
 * - Provides precise word-level timestamps
 * - Detects and marks filler words automatically
 */

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  is_filler?: boolean;
}

export interface DetectedFiller {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
  words: WordTimestamp[];
}

export interface CrisperWhisperResult {
  success: boolean;
  text?: string;
  segments?: TranscriptionSegment[];
  word_timestamps?: WordTimestamp[];
  fillers?: DetectedFiller[];
  filler_count?: number;
  language?: string;
  duration?: number;
  error?: string;
}

export interface TranscribeOptions {
  audioUrl?: string;
  audioBase64?: string;
  language?: "pt" | "en" | "es";
}

// Modal endpoint URL
const CRISPER_WHISPER_ENDPOINT = process.env.CRISPER_WHISPER_URL ||
  "https://marcosremar--aeropod-crisper-whisper-transcribe.modal.run";

/**
 * Transcribe audio using CrisperWhisper
 * Returns verbatim transcription with filler words detected
 */
export async function transcribeWithCrisperWhisper(
  options: TranscribeOptions
): Promise<CrisperWhisperResult> {
  const { audioUrl, audioBase64, language = "pt" } = options;

  if (!audioUrl && !audioBase64) {
    return {
      success: false,
      error: "Must provide audioUrl or audioBase64",
    };
  }

  try {
    console.log("[CrisperWhisper] Starting transcription...");

    const requestBody: Record<string, string> = { language };

    if (audioUrl) {
      requestBody.audio_url = audioUrl;
    } else if (audioBase64) {
      requestBody.audio_base64 = audioBase64;
    }

    const response = await fetch(CRISPER_WHISPER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[CrisperWhisper] API error:", errorText);
      return {
        success: false,
        error: `API error: ${response.status} - ${errorText}`,
      };
    }

    const result = await response.json();

    console.log(`[CrisperWhisper] Transcription complete: ${result.filler_count || 0} fillers detected`);

    return result as CrisperWhisperResult;
  } catch (error) {
    console.error("[CrisperWhisper] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Transcribe audio from URL
 */
export async function transcribeFromUrl(
  audioUrl: string,
  language: "pt" | "en" | "es" = "pt"
): Promise<CrisperWhisperResult> {
  return transcribeWithCrisperWhisper({ audioUrl, language });
}

/**
 * Transcribe audio from base64
 */
export async function transcribeFromBase64(
  audioBase64: string,
  language: "pt" | "en" | "es" = "pt"
): Promise<CrisperWhisperResult> {
  return transcribeWithCrisperWhisper({ audioBase64, language });
}

/**
 * Extract just the fillers from a transcription result
 */
export function extractFillers(result: CrisperWhisperResult): DetectedFiller[] {
  if (!result.success || !result.fillers) {
    return [];
  }
  return result.fillers;
}

/**
 * Get total filler duration in seconds
 */
export function getFillerDuration(fillers: DetectedFiller[]): number {
  return fillers.reduce((total, filler) => total + (filler.end - filler.start), 0);
}

/**
 * Group fillers by word type
 */
export function groupFillersByType(fillers: DetectedFiller[]): Record<string, DetectedFiller[]> {
  const grouped: Record<string, DetectedFiller[]> = {};

  for (const filler of fillers) {
    const word = filler.word.toLowerCase();
    if (!grouped[word]) {
      grouped[word] = [];
    }
    grouped[word].push(filler);
  }

  return grouped;
}

/**
 * Get filler statistics
 */
export function getFillerStats(fillers: DetectedFiller[]): {
  totalCount: number;
  totalDuration: number;
  byType: Record<string, { count: number; duration: number }>;
} {
  const grouped = groupFillersByType(fillers);
  const byType: Record<string, { count: number; duration: number }> = {};

  for (const [word, wordFillers] of Object.entries(grouped)) {
    byType[word] = {
      count: wordFillers.length,
      duration: wordFillers.reduce((sum, f) => sum + (f.end - f.start), 0),
    };
  }

  return {
    totalCount: fillers.length,
    totalDuration: getFillerDuration(fillers),
    byType,
  };
}

/**
 * Check if CrisperWhisper service is available
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const healthUrl = CRISPER_WHISPER_ENDPOINT.replace("/transcribe", "/health");
    const response = await fetch(healthUrl, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Convert CrisperWhisper segments to pipeline format
 * Used to integrate with existing pipeline
 */
export function convertToSegments(result: CrisperWhisperResult): Array<{
  start: number;
  end: number;
  text: string;
  words?: WordTimestamp[];
}> {
  if (!result.success || !result.segments) {
    return [];
  }

  return result.segments.map((segment) => ({
    start: segment.start,
    end: segment.end,
    text: segment.text,
    words: segment.words,
  }));
}

// Default export for easy import
const crisperWhisperService = {
  transcribe: transcribeWithCrisperWhisper,
  transcribeFromUrl,
  transcribeFromBase64,
  extractFillers,
  getFillerDuration,
  groupFillersByType,
  getFillerStats,
  checkHealth,
  convertToSegments,
};

export default crisperWhisperService;
