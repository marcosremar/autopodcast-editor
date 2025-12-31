import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { projects } from "@/lib/db/schema";
import { SectionAssemblyService } from "@/lib/sections/SectionAssemblyService";

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

    // Get missing sections
    const sectionAssembly = new SectionAssemblyService(db);
    const missingSections = await sectionAssembly.getMissingSections(projectId);

    // Get completion stats
    const stats = await sectionAssembly.getSectionCompletionStats(projectId);

    return NextResponse.json({
      success: true,
      missingSections,
      stats,
    });
  } catch (error: any) {
    console.error("Error getting missing sections:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get missing sections",
      },
      { status: 500 }
    );
  }
}
