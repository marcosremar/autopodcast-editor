/**
 * Social Clips API
 * GET - List clips for a project
 * POST - Generate clip suggestions
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { socialClipService } from "@/lib/clips/social-clip-service";
import { db } from "@/lib/db";
import { projects, segments, socialClips } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET - List clips for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const clips = await socialClipService.getProjectClips(projectId);

    return NextResponse.json({
      success: true,
      clips,
      count: clips.length,
    });
  } catch (error) {
    console.error("Error getting clips:", error);
    return NextResponse.json(
      { error: "Failed to get clips" },
      { status: 500 }
    );
  }
}

// POST - Generate clip suggestions
const generateSchema = z.object({
  count: z.number().min(1).max(10).default(5),
  save: z.boolean().default(false),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { count, save } = generateSchema.parse(body);

    // Get project
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get segments
    const projectSegments = await db
      .select()
      .from(segments)
      .where(eq(segments.projectId, projectId))
      .orderBy(segments.startTime);

    if (projectSegments.length === 0) {
      return NextResponse.json(
        { error: "No segments available" },
        { status: 400 }
      );
    }

    // Generate suggestions
    const suggestions = await socialClipService.generateSuggestions(
      projectSegments,
      count
    );

    // Save if requested
    let savedClips = [];
    if (save) {
      for (const suggestion of suggestions) {
        const saved = await socialClipService.saveClip(projectId, suggestion);
        savedClips.push(saved);
      }
    }

    return NextResponse.json({
      success: true,
      suggestions,
      saved: save,
      savedClips: save ? savedClips : undefined,
    });
  } catch (error) {
    console.error("Error generating clips:", error);
    return NextResponse.json(
      { error: "Failed to generate clips" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific clip
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const clipId = searchParams.get("clipId");

    if (!clipId) {
      return NextResponse.json(
        { error: "clipId parameter required" },
        { status: 400 }
      );
    }

    await socialClipService.deleteClip(clipId);

    return NextResponse.json({
      success: true,
      message: "Clip deleted",
    });
  } catch (error) {
    console.error("Error deleting clip:", error);
    return NextResponse.json(
      { error: "Failed to delete clip" },
      { status: 500 }
    );
  }
}
