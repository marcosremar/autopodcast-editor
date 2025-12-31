import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { projectSections } from "@/lib/db/schema";
import { SectionAssemblyService } from "@/lib/sections/SectionAssemblyService";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const { sectionId } = await params;
    const body = await request.json();

    const { status, audioUrl, transcription, duration, notes } = body;

    // Verify section exists
    const [section] = await db
      .select()
      .from(projectSections)
      .where(eq(projectSections.id, sectionId))
      .limit(1);

    if (!section) {
      return NextResponse.json(
        { success: false, error: "Section not found" },
        { status: 404 }
      );
    }

    // Prevent modification of approved sections unless explicitly re-opening
    if (section.status === "approved" && status !== "review") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot modify approved section. Re-open for review first.",
        },
        { status: 400 }
      );
    }

    // Update section
    const sectionAssembly = new SectionAssemblyService(db);
    const updated = await sectionAssembly.updateSectionStatus(
      sectionId,
      status || section.status,
      {
        audioUrl,
        transcription,
        duration,
        notes,
      }
    );

    return NextResponse.json({
      success: true,
      section: updated,
    });
  } catch (error: any) {
    console.error("Error updating section:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update section",
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const { sectionId } = await params;

    // Get section with segments
    const sectionAssembly = new SectionAssemblyService(db);

    const [section] = await db
      .select()
      .from(projectSections)
      .where(eq(projectSections.id, sectionId))
      .limit(1);

    if (!section) {
      return NextResponse.json(
        { success: false, error: "Section not found" },
        { status: 404 }
      );
    }

    // Get assigned segments
    const segments = await sectionAssembly.getSectionSegments(sectionId);

    return NextResponse.json({
      success: true,
      section,
      segments,
    });
  } catch (error: any) {
    console.error("Error getting section:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get section",
      },
      { status: 500 }
    );
  }
}
