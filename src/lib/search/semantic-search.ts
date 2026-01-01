/**
 * Semantic Search Service
 * Uses embeddings + re-ranking for intelligent search
 */

import { Segment } from "@/lib/db/schema";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const EMBEDDING_MODEL = "qwen/qwen3-embedding-8b"; // or "openai/text-embedding-3-small"
const RERANK_MODEL = "google/gemini-2.0-flash-001"; // Fast model for re-ranking

export interface SearchResult {
  segment: Segment;
  score: number;
  relevanceExplanation?: string;
}

interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Get embeddings for text(s) using OpenRouter
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (!OPENROUTER_API_KEY) {
    console.warn("[Search] No OpenRouter API key, using fallback search");
    return [];
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "AeroPod Search",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Search] Embedding API error:", error);
      return [];
    }

    const data: EmbeddingResponse = await response.json();
    return data.data.map((d) => d.embedding);
  } catch (error) {
    console.error("[Search] Error getting embeddings:", error);
    return [];
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Re-rank results using LLM for better relevance
 */
async function rerankResults(
  query: string,
  candidates: Array<{ segment: Segment; similarityScore: number }>,
  topK: number = 10
): Promise<SearchResult[]> {
  if (!OPENROUTER_API_KEY || candidates.length === 0) {
    // Fallback: return by similarity score
    return candidates.slice(0, topK).map((c) => ({
      segment: c.segment,
      score: c.similarityScore * 100,
    }));
  }

  // Prepare context for LLM re-ranking
  const candidateTexts = candidates.slice(0, 20).map((c, i) => ({
    id: i,
    text: c.segment.text.slice(0, 300), // Truncate for efficiency
    topic: c.segment.topic || "sem topico",
    time: `${Math.floor(c.segment.startTime / 60)}:${Math.floor(c.segment.startTime % 60).toString().padStart(2, "0")}`,
  }));

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "AeroPod Rerank",
      },
      body: JSON.stringify({
        model: RERANK_MODEL,
        messages: [
          {
            role: "system",
            content: `Voce e um sistema de re-ranking para busca em transcricoes de podcast.
Dado uma query de busca e uma lista de segmentos, retorne os IDs dos segmentos mais relevantes em ordem decrescente de relevancia.

IMPORTANTE: Retorne APENAS um JSON array com os IDs, nada mais.
Exemplo de resposta: [3, 1, 7, 0, 5]

Considere:
- Relevancia semantica (o significado, nao apenas palavras)
- Contexto do topico
- Se o segmento responde a pergunta ou menciona o assunto`
          },
          {
            role: "user",
            content: `Query: "${query}"

Segmentos:
${candidateTexts.map((c) => `[${c.id}] ${c.topic} (${c.time}): ${c.text}`).join("\n\n")}

Retorne os IDs dos ${Math.min(topK, candidateTexts.length)} segmentos mais relevantes em ordem de relevancia:`
          }
        ],
        temperature: 0.1,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      console.error("[Search] Rerank API error:", await response.text());
      return candidates.slice(0, topK).map((c) => ({
        segment: c.segment,
        score: c.similarityScore * 100,
      }));
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse the JSON array from response
    const match = content.match(/\[[\d,\s]+\]/);
    if (!match) {
      console.warn("[Search] Could not parse rerank response:", content);
      return candidates.slice(0, topK).map((c) => ({
        segment: c.segment,
        score: c.similarityScore * 100,
      }));
    }

    const rankedIds: number[] = JSON.parse(match[0]);

    // Build results in ranked order
    const results: SearchResult[] = [];
    for (let i = 0; i < rankedIds.length && results.length < topK; i++) {
      const id = rankedIds[i];
      if (id >= 0 && id < candidates.length) {
        const candidate = candidates[id];
        results.push({
          segment: candidate.segment,
          score: 100 - (i * 5), // Score decreases by rank position
        });
      }
    }

    return results;
  } catch (error) {
    console.error("[Search] Error re-ranking:", error);
    return candidates.slice(0, topK).map((c) => ({
      segment: c.segment,
      score: c.similarityScore * 100,
    }));
  }
}

/**
 * Hybrid search: combines exact match + semantic similarity + re-ranking
 */
export async function hybridSearch(
  query: string,
  segments: Segment[],
  options: {
    topK?: number;
    useReranking?: boolean;
  } = {}
): Promise<SearchResult[]> {
  const { topK = 10, useReranking = true } = options;

  if (!query.trim() || segments.length === 0) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();

  // Stage 1: Exact match scoring
  const exactMatches = new Map<string, number>();
  segments.forEach((segment) => {
    const text = segment.text.toLowerCase();
    if (text.includes(normalizedQuery)) {
      const matchCount = (text.match(new RegExp(normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g")) || []).length;
      exactMatches.set(segment.id, matchCount * 0.3); // Boost for exact matches
    }
  });

  // Stage 2: Semantic similarity using embeddings
  const [queryEmbedding, ...segmentEmbeddings] = await getEmbeddings([
    query,
    ...segments.map((s) => `${s.topic || ""} ${s.text.slice(0, 500)}`),
  ]);

  // Calculate similarity scores
  const candidates: Array<{ segment: Segment; similarityScore: number }> = [];

  if (queryEmbedding && segmentEmbeddings.length > 0) {
    // Use embeddings
    segments.forEach((segment, i) => {
      const similarity = cosineSimilarity(queryEmbedding, segmentEmbeddings[i] || []);
      const exactBoost = exactMatches.get(segment.id) || 0;
      candidates.push({
        segment,
        similarityScore: similarity + exactBoost,
      });
    });
  } else {
    // Fallback to keyword-based scoring
    console.log("[Search] Using fallback keyword search");
    const queryWords = normalizedQuery.split(/\s+/).filter((w) => w.length > 2);

    segments.forEach((segment) => {
      const text = segment.text.toLowerCase();
      let score = 0;

      // Exact match boost
      if (exactMatches.has(segment.id)) {
        score += exactMatches.get(segment.id)! + 0.5;
      }

      // Keyword matching
      queryWords.forEach((word) => {
        if (text.includes(word)) score += 0.15;
        if (segment.topic?.toLowerCase().includes(word)) score += 0.25;
        if (segment.keyInsight?.toLowerCase().includes(word)) score += 0.2;
      });

      if (score > 0) {
        candidates.push({ segment, similarityScore: score });
      }
    });
  }

  // Sort by similarity
  candidates.sort((a, b) => b.similarityScore - a.similarityScore);

  // Stage 3: Re-ranking with LLM (optional)
  if (useReranking && candidates.length > 3) {
    return rerankResults(query, candidates.slice(0, 20), topK);
  }

  // Return top results without re-ranking
  return candidates.slice(0, topK).map((c) => ({
    segment: c.segment,
    score: c.similarityScore * 100,
  }));
}

/**
 * Quick search without re-ranking (for real-time UI)
 */
export async function quickSearch(
  query: string,
  segments: Segment[],
  topK: number = 10
): Promise<SearchResult[]> {
  return hybridSearch(query, segments, { topK, useReranking: false });
}
