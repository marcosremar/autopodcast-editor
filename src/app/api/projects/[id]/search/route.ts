import { NextRequest, NextResponse } from "next/server";
import { db, segments } from "@/lib/db";
import { eq } from "drizzle-orm";
import { hybridSearch, quickSearch } from "@/lib/search/semantic-search";

/**
 * POST /api/projects/[id]/search
 * Semantic search in project segments
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { query, mode = "quick", topK = 10 } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
      return NextResponse.json(
        { error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    // Get all segments for the project
    const projectSegments = await db
      .select()
      .from(segments)
      .where(eq(segments.projectId, projectId));

    if (projectSegments.length === 0) {
      return NextResponse.json({
        results: [],
        query,
        totalSegments: 0,
      });
    }

    // Perform search based on mode
    const searchFn = mode === "full" ? hybridSearch : quickSearch;
    const results = await searchFn(query, projectSegments, topK);

    return NextResponse.json({
      results: results.map((r) => ({
        segmentId: r.segment.id,
        text: r.segment.text,
        startTime: r.segment.startTime,
        endTime: r.segment.endTime,
        topic: r.segment.topic,
        score: r.score,
      })),
      query,
      totalSegments: projectSegments.length,
      mode,
    });
  } catch (error) {
    console.error("[Search API] Error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
