import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { projectSections, sectionSegments, segments } from "@/lib/db/schema";

/**
 * POST /api/projects/[id]/sections/[sectionId]/segments
 * Assign a segment to a section
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const { id: projectId, sectionId } = await params;
    const body = await request.json();
    const { segmentId } = body;

    if (!segmentId) {
      return NextResponse.json(
        { success: false, error: "segmentId is required" },
        { status: 400 }
      );
    }

    // Verify section exists and belongs to project
    const [section] = await db
      .select()
      .from(projectSections)
      .where(
        and(
          eq(projectSections.id, sectionId),
          eq(projectSections.projectId, projectId)
        )
      )
      .limit(1);

    if (!section) {
      return NextResponse.json(
        { success: false, error: "Section not found" },
        { status: 404 }
      );
    }

    // Verify segment exists and belongs to project
    const [segment] = await db
      .select()
      .from(segments)
      .where(
        and(
          eq(segments.id, segmentId),
          eq(segments.projectId, projectId)
        )
      )
      .limit(1);

    if (!segment) {
      return NextResponse.json(
        { success: false, error: "Segment not found" },
        { status: 404 }
      );
    }

    // Get max order for this section
    const existingMappings = await db
      .select()
      .from(sectionSegments)
      .where(eq(sectionSegments.sectionId, sectionId));

    const maxOrder = existingMappings.reduce(
      (max, m) => Math.max(max, m.order || 0),
      0
    );

    // Create the mapping
    await db.insert(sectionSegments).values({
      id: crypto.randomUUID(),
      sectionId,
      segmentId,
      order: maxOrder + 1,
      confidence: 1.0, // User-assigned = 100% confidence
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update section status based on content
    // This is a simple implementation - you might want more sophisticated logic
    await db
      .update(projectSections)
      .set({
        status: "partial",
        updatedAt: new Date(),
      })
      .where(eq(projectSections.id, sectionId));

    return NextResponse.json({
      success: true,
      message: "Segment assigned to section",
      sectionId,
      segmentId,
    });
  } catch (error: any) {
    console.error("Error assigning segment to section:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to assign segment to section",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/sections/[sectionId]/segments
 * Get all segments assigned to a section
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const { id: projectId, sectionId } = await params;

    // Verify section exists and belongs to project
    const [section] = await db
      .select()
      .from(projectSections)
      .where(
        and(
          eq(projectSections.id, sectionId),
          eq(projectSections.projectId, projectId)
        )
      )
      .limit(1);

    if (!section) {
      return NextResponse.json(
        { success: false, error: "Section not found" },
        { status: 404 }
      );
    }

    // Get all segment mappings for this section
    const mappings = await db
      .select({
        mapping: sectionSegments,
        segment: segments,
      })
      .from(sectionSegments)
      .leftJoin(segments, eq(sectionSegments.segmentId, segments.id))
      .where(eq(sectionSegments.sectionId, sectionId))
      .orderBy(sectionSegments.order);

    return NextResponse.json({
      success: true,
      sectionId,
      segments: mappings.map((m) => ({
        ...m.segment,
        order: m.mapping.order,
        confidence: m.mapping.confidence,
      })),
    });
  } catch (error: any) {
    console.error("Error getting section segments:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get section segments",
      },
      { status: 500 }
    );
  }
}
