/**
 * Topic Segmentation Service
 *
 * Uses LLM via Groq (primary) or OpenRouter (fallback) to analyze transcription
 * and identify topic/theme changes.
 * Creates chapters/sections based on content rather than speaker changes.
 *
 * Groq provides fast inference with Llama and Mixtral models.
 * OpenRouter provides access to Gemini, Llama, and other open models.
 */

export interface TopicSegment {
  id: number;
  title: string;
  description?: string;
  start: number; // seconds
  end: number; // seconds
  startSegmentIndex: number;
  endSegmentIndex: number;
  keywords?: string[];
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface TopicSegmentationResult {
  success: boolean;
  topics: TopicSegment[];
  summary?: string;
  error?: string;
}

const TOPIC_SEGMENTATION_PROMPT = `Você é um especialista em análise de conteúdo de podcasts e vídeos.

Analise a transcrição abaixo e identifique os TÓPICOS/TEMAS principais discutidos.
Para cada tópico, identifique:
1. Um título curto e descritivo (máximo 5 palavras)
2. Uma breve descrição (1-2 frases)
3. O índice do segmento onde começa
4. O índice do segmento onde termina
5. Palavras-chave relevantes (3-5 palavras)

Regras importantes:
- Identifique mudanças REAIS de assunto, não apenas pausas ou transições
- Um tópico deve ter pelo menos 30 segundos de duração
- Não crie muitos tópicos - agrupe assuntos relacionados
- Use títulos em português que façam sentido para o contexto
- Considere o fluxo natural da conversa

Formato de resposta (JSON):
{
  "topics": [
    {
      "title": "Título do Tópico",
      "description": "Breve descrição do que é discutido",
      "startSegmentIndex": 0,
      "endSegmentIndex": 5,
      "keywords": ["palavra1", "palavra2", "palavra3"]
    }
  ],
  "summary": "Resumo geral do conteúdo em 2-3 frases"
}

TRANSCRIÇÃO:
`;

/**
 * Detect topics using Groq API (fast Llama inference)
 */
async function detectTopicsWithGroq(
  formattedTranscript: string,
  model: string = 'llama-3.3-70b-versatile'
): Promise<{ content: string } | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  console.log(`[TopicSegmentation] Using Groq with ${model}...`);

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: `${TOPIC_SEGMENTATION_PROMPT}\n${formattedTranscript}\n\nResponda APENAS com o JSON, sem texto adicional.`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[TopicSegmentation] Groq error: ${response.status} - ${errorText}`);
    return null;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  return content ? { content } : null;
}

/**
 * Detect topics using OpenRouter API (fallback)
 */
async function detectTopicsWithOpenRouter(
  formattedTranscript: string,
  model: string = 'google/gemini-flash-1.5'
): Promise<{ content: string } | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  console.log(`[TopicSegmentation] Using OpenRouter with ${model}...`);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: `${TOPIC_SEGMENTATION_PROMPT}\n${formattedTranscript}\n\nResponda APENAS com o JSON, sem texto adicional.`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[TopicSegmentation] OpenRouter error: ${response.status} - ${errorText}`);
    return null;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  return content ? { content } : null;
}

/**
 * Detect topics in transcription using Groq (primary) or OpenRouter (fallback)
 */
export async function detectTopics(
  segments: TranscriptSegment[],
  options: {
    language?: string;
    maxTopics?: number;
    minTopicDuration?: number;
    model?: string;
    provider?: 'groq' | 'openrouter' | 'auto';
  } = {}
): Promise<TopicSegmentationResult> {
  const {
    maxTopics = 10,
    minTopicDuration = 30,
    provider = 'auto',
  } = options;

  // Format transcript
  const formattedTranscript = segments
    .map((seg, index) => {
      const timestamp = formatTime(seg.start);
      const speaker = seg.speaker ? `[${seg.speaker}]` : '';
      return `[${index}] ${timestamp} ${speaker} ${seg.text}`;
    })
    .join('\n');

  try {
    let result: { content: string } | null = null;

    // Try Groq first (faster and more reliable)
    if (provider === 'auto' || provider === 'groq') {
      result = await detectTopicsWithGroq(formattedTranscript);
    }

    // Fallback to OpenRouter if Groq fails
    if (!result && (provider === 'auto' || provider === 'openrouter')) {
      result = await detectTopicsWithOpenRouter(formattedTranscript);
    }

    if (!result) {
      return {
        success: false,
        topics: [],
        error: 'No LLM provider available. Configure GROQ_API_KEY or OPENROUTER_API_KEY.',
      };
    }

    // Extract JSON
    let jsonStr = result.content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Convert to TopicSegment format
    const topics: TopicSegment[] = (parsed.topics || []).map((topic: any, index: number) => {
      const startIdx = Math.max(0, topic.startSegmentIndex);
      const endIdx = Math.min(segments.length - 1, topic.endSegmentIndex);

      const startSeg = segments[startIdx];
      const endSeg = segments[endIdx];

      return {
        id: index,
        title: topic.title,
        description: topic.description,
        start: startSeg?.start || 0,
        end: endSeg?.end || 0,
        startSegmentIndex: startIdx,
        endSegmentIndex: endIdx,
        keywords: topic.keywords || [],
      };
    });

    // Filter and limit
    const filteredTopics = topics
      .filter((topic) => topic.end - topic.start >= minTopicDuration)
      .slice(0, maxTopics);

    console.log(`[TopicSegmentation] Detected ${filteredTopics.length} topics`);

    return {
      success: true,
      topics: filteredTopics,
      summary: parsed.summary,
    };
  } catch (error) {
    console.error('[TopicSegmentation] Error:', error);
    return {
      success: false,
      topics: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Create chapters from topics (for YouTube/Spotify format)
 */
export function topicsToChapters(topics: TopicSegment[]): string {
  return topics
    .map((topic) => `${formatTime(topic.start)} ${topic.title}`)
    .join('\n');
}

/**
 * Create show notes from topics
 */
export function topicsToShowNotes(
  topics: TopicSegment[],
  options: { includeSummary?: boolean; summary?: string } = {}
): string {
  let notes = '';

  if (options.includeSummary && options.summary) {
    notes += `## Resumo\n${options.summary}\n\n`;
  }

  notes += '## Capítulos\n\n';

  for (const topic of topics) {
    notes += `### ${formatTime(topic.start)} - ${topic.title}\n`;
    if (topic.description) {
      notes += `${topic.description}\n`;
    }
    if (topic.keywords && topic.keywords.length > 0) {
      notes += `*Tags: ${topic.keywords.join(', ')}*\n`;
    }
    notes += '\n';
  }

  return notes;
}

export default {
  detectTopics,
  topicsToChapters,
  topicsToShowNotes,
};
