import { NextRequest, NextResponse } from "next/server";
import { db, segments } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSemanticSearchService } from "@/lib/ai/semantic-search";

/**
 * POST /api/search
 * Busca semantica nos segmentos de um projeto
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, query, topK = 10 } = await request.json();

    if (!projectId || !query) {
      return NextResponse.json(
        { error: "projectId and query are required" },
        { status: 400 }
      );
    }

    // Buscar segmentos do projeto
    const projectSegments = await db
      .select()
      .from(segments)
      .where(eq(segments.projectId, projectId));

    if (projectSegments.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Busca semantica
    const searchService = getSemanticSearchService();
    const results = await searchService.search(
      query,
      projectSegments.map(s => ({
        id: s.id,
        text: s.text,
        topic: s.topic || undefined,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      { topK, useRerank: topK <= 5 } // Usar rerank para buscas pequenas
    );

    return NextResponse.json({
      results: results.map(r => ({
        id: r.id,
        text: r.text,
        score: r.score,
        topic: r.metadata?.topic,
        startTime: r.metadata?.startTime,
        endTime: r.metadata?.endTime,
      })),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
