/**
 * Pyannote Speaker Diarization Service
 *
 * Client for the pyannote.audio Modal deployment.
 * State-of-the-art speaker diarization.
 */

const PYANNOTE_URL = process.env.PYANNOTE_DIARIZATION_URL ||
  'https://marcosremar--aeropod-pyannote-diarization-diarize.modal.run';

export interface DiarizationSegment {
  speaker: string;
  start: number;
  end: number;
  duration: number;
}

export interface SpeakerStats {
  total_time: number;
  percentage: number;
  segments_count: number;
}

export interface DiarizationResult {
  success: boolean;
  speakers?: string[];
  num_speakers?: number;
  segments?: DiarizationSegment[];
  timeline?: DiarizationSegment[];
  speaker_stats?: Record<string, SpeakerStats>;
  duration?: number;
  error?: string;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

export interface AlignedSegment extends TranscriptSegment {
  speaker: string;
}

/**
 * Run speaker diarization on audio
 */
export async function diarize(
  audioUrl: string,
  options: {
    numSpeakers?: number;
    minSpeakers?: number;
    maxSpeakers?: number;
  } = {}
): Promise<DiarizationResult> {
  try {
    console.log('[Pyannote] Starting diarization...');

    const response = await fetch(PYANNOTE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        num_speakers: options.numSpeakers,
        min_speakers: options.minSpeakers,
        max_speakers: options.maxSpeakers,
      }),
    });

    if (!response.ok) {
      throw new Error(`Pyannote API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Diarization failed');
    }

    console.log(`[Pyannote] Diarization complete: ${result.num_speakers} speakers`);

    return result;
  } catch (error) {
    console.error('[Pyannote] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run diarization from base64 audio
 */
export async function diarizeFromBase64(
  audioBase64: string,
  options: {
    numSpeakers?: number;
    minSpeakers?: number;
    maxSpeakers?: number;
  } = {}
): Promise<DiarizationResult> {
  try {
    console.log('[Pyannote] Starting diarization from base64...');

    const response = await fetch(PYANNOTE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_base64: audioBase64,
        num_speakers: options.numSpeakers,
        min_speakers: options.minSpeakers,
        max_speakers: options.maxSpeakers,
      }),
    });

    if (!response.ok) {
      throw new Error(`Pyannote API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Diarization failed');
    }

    console.log(`[Pyannote] Diarization complete: ${result.num_speakers} speakers`);

    return result;
  } catch (error) {
    console.error('[Pyannote] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Align transcription segments with diarization (client-side)
 */
export function alignWithTranscript(
  diarizationSegments: DiarizationSegment[],
  transcriptSegments: TranscriptSegment[]
): AlignedSegment[] {
  const aligned: AlignedSegment[] = [];

  for (const transSeg of transcriptSegments) {
    const transMid = (transSeg.start + transSeg.end) / 2;

    // Find the speaker at the midpoint of this segment
    let speaker = 'UNKNOWN';
    for (const diarSeg of diarizationSegments) {
      if (diarSeg.start <= transMid && transMid <= diarSeg.end) {
        speaker = diarSeg.speaker;
        break;
      }
    }

    aligned.push({
      ...transSeg,
      speaker,
    });
  }

  return aligned;
}

/**
 * Get human-readable speaker names (Speaker 1, Speaker 2, etc.)
 */
export function getSpeakerDisplayNames(speakers: string[]): Record<string, string> {
  const names: Record<string, string> = {};

  // Sort speakers to ensure consistent ordering
  const sortedSpeakers = [...speakers].sort();

  sortedSpeakers.forEach((speaker, index) => {
    names[speaker] = `Speaker ${index + 1}`;
  });

  return names;
}

/**
 * Format speaker stats for display
 */
export function formatSpeakerStats(
  stats: Record<string, SpeakerStats>,
  displayNames?: Record<string, string>
): string {
  const lines: string[] = [];

  for (const [speaker, stat] of Object.entries(stats)) {
    const name = displayNames?.[speaker] || speaker;
    const minutes = Math.floor(stat.total_time / 60);
    const seconds = Math.round(stat.total_time % 60);
    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    lines.push(`${name}: ${timeStr} (${stat.percentage}%)`);
  }

  return lines.join('\n');
}

export default {
  diarize,
  diarizeFromBase64,
  alignWithTranscript,
  getSpeakerDisplayNames,
  formatSpeakerStats,
};
