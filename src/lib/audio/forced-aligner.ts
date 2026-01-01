/**
 * Forced Aligner Service
 * Calls Modal-deployed CTC-Forced-Aligner for precise word-level timestamps
 * Provides ~20ms precision vs ~100-200ms from Whisper
 */

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  score?: number;
}

export interface AlignmentResult {
  success: boolean;
  word_timestamps: WordTimestamp[];
  language?: string;
  duration?: number;
  error?: string;
}

export interface SegmentForAlignment {
  start: number;
  end: number;
  text: string;
}

export interface AlignedSegment extends SegmentForAlignment {
  word_timestamps: WordTimestamp[];
  alignment_error?: string;
}

export interface AlignSegmentsResult {
  success: boolean;
  segments: AlignedSegment[];
  error?: string;
}

const FORCED_ALIGNER_URL = "https://marcosremar--aeropod-forced-aligner-align-segments.modal.run";
const FORCED_ALIGNER_HEALTH_URL = "https://marcosremar--aeropod-forced-aligner-health.modal.run";

/**
 * Service for calling the Modal-deployed Forced Aligner
 */
export class ForcedAlignerService {
  private timeout: number;

  constructor(timeoutMs: number = 120000) {
    this.timeout = timeoutMs;
  }

  /**
   * Check if the Forced Aligner service is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(FORCED_ALIGNER_HEALTH_URL, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn("[ForcedAligner] Health check failed:", response.status);
        return false;
      }

      const data = await response.json();
      return data.status === "ok";
    } catch (error) {
      console.warn("[ForcedAligner] Health check error:", error);
      return false;
    }
  }

  /**
   * Align multiple segments with the forced aligner
   * Takes audio URL and segments with text, returns segments with precise word timestamps
   */
  async alignSegments(
    audioUrl: string,
    segments: SegmentForAlignment[],
    language: string = "por"
  ): Promise<AlignSegmentsResult> {
    try {
      console.log(`[ForcedAligner] Starting alignment for ${segments.length} segments`);

      // First, fetch the audio and convert to base64
      // This is needed because Modal containers may not be able to access all URLs
      const audioBase64 = await this.fetchAudioAsBase64(audioUrl);

      if (!audioBase64) {
        console.warn("[ForcedAligner] Failed to fetch audio, returning original segments");
        return {
          success: false,
          segments: segments.map(s => ({ ...s, word_timestamps: [] })),
          error: "Failed to fetch audio",
        };
      }

      console.log(`[ForcedAligner] Audio fetched, base64 length: ${audioBase64.length}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(FORCED_ALIGNER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio_base64: audioBase64,
          segments: segments.map(s => ({
            start: s.start,
            end: s.end,
            text: s.text,
          })),
          language,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[ForcedAligner] API error:", response.status, errorText);
        return {
          success: false,
          segments: segments.map(s => ({ ...s, word_timestamps: [] })),
          error: `API error: ${response.status}`,
        };
      }

      const result: AlignSegmentsResult = await response.json();

      if (result.success) {
        console.log(`[ForcedAligner] Alignment successful for ${result.segments.length} segments`);
        // Log sample of word timestamps
        const sampleSegment = result.segments[0];
        if (sampleSegment?.word_timestamps?.length > 0) {
          console.log(`[ForcedAligner] Sample word timestamps:`,
            sampleSegment.word_timestamps.slice(0, 5)
          );
        }
      } else {
        console.warn("[ForcedAligner] Alignment failed:", result.error);
      }

      return result;
    } catch (error) {
      console.error("[ForcedAligner] Error:", error);
      return {
        success: false,
        segments: segments.map(s => ({ ...s, word_timestamps: [] })),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Fetch audio from URL and convert to base64
   * Also accepts data URLs (data:audio/mpeg;base64,...)
   */
  private async fetchAudioAsBase64(audioUrl: string): Promise<string | null> {
    try {
      // Check if already base64 data URL
      if (audioUrl.startsWith('data:')) {
        const base64Match = audioUrl.match(/^data:[^;]+;base64,(.+)$/);
        if (base64Match) {
          console.log(`[ForcedAligner] Using provided base64 data, length: ${base64Match[1].length}`);
          return base64Match[1];
        }
      }

      console.log(`[ForcedAligner] Fetching audio from: ${audioUrl.substring(0, 80)}...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for audio download

      const response = await fetch(audioUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error("[ForcedAligner] Failed to fetch audio:", response.status);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      console.log(`[ForcedAligner] Audio fetched, size: ${arrayBuffer.byteLength} bytes`);
      return base64;
    } catch (error) {
      console.error("[ForcedAligner] Error fetching audio:", error);
      return null;
    }
  }
}

// Singleton instance
let forcedAlignerInstance: ForcedAlignerService | null = null;

export function getForcedAlignerService(): ForcedAlignerService {
  if (!forcedAlignerInstance) {
    forcedAlignerInstance = new ForcedAlignerService();
  }
  return forcedAlignerInstance;
}
