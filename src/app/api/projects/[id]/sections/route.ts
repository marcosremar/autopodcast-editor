import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { projects, projectSections, templateSections } from "@/lib/db/schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Verify project exists
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Get project sections with template section details
    const sections = await db
      .select({
        id: projectSections.id,
        projectId: projectSections.projectId,
        templateSectionId: projectSections.templateSectionId,
        name: projectSections.name,
        order: projectSections.order,
        status: projectSections.status,
        audioUrl: projectSections.audioUrl,
        transcription: projectSections.transcription,
        duration: projectSections.duration,
        uploadedAt: projectSections.uploadedAt,
        approvedAt: projectSections.approvedAt,
        approvedBy: projectSections.approvedBy,
        notes: projectSections.notes,
        metadata: projectSections.metadata,
        createdAt: projectSections.createdAt,
        updatedAt: projectSections.updatedAt,
        templateSection: {
          id: templateSections.id,
          name: templateSections.name,
          description: templateSections.description,
          isRequired: templateSections.isRequired,
          type: templateSections.type,
          minDuration: templateSections.minDuration,
          maxDuration: templateSections.maxDuration,
          suggestedDuration: templateSections.suggestedDuration,
          exampleText: templateSections.exampleText,
          icon: templateSections.icon,
          color: templateSections.color,
        },
      })
      .from(projectSections)
      .leftJoin(
        templateSections,
        eq(projectSections.templateSectionId, templateSections.id)
      )
      .where(eq(projectSections.projectId, projectId))
      .orderBy(projectSections.order);

    return NextResponse.json({
      success: true,
      sections,
    });
  } catch (error: any) {
    console.error("Error getting project sections:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get project sections",
      },
      { status: 500 }
    );
  }
}
