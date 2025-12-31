/**
 * Filler Words API
 * GET - List all fillers for a project
 * POST - Detect fillers in project
 * PATCH - Mark fillers for removal
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getProjectFillers,
  processProjectFillers,
  markFillersForRemoval,
  markAllFillersForRemoval,
  getFillerStats,
} from "@/lib/audio/filler-detection";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET - List all fillers for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const fillers = await getProjectFillers(projectId);
    const stats = await getFillerStats(projectId);

    return NextResponse.json({
      success: true,
      fillers,
      stats,
    });
  } catch (error) {
    console.error("Error getting fillers:", error);
    return NextResponse.json(
      { error: "Failed to get fillers" },
      { status: 500 }
    );
  }
}

// POST - Detect fillers in project
const detectSchema = z.object({
  language: z.enum(["pt", "en"]).default("pt"),
  reprocess: z.boolean().default(false),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { language, reprocess } = detectSchema.parse(body);

    // Check if project exists
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if already processed and not forcing reprocess
    if (project.fillerWordsCount && project.fillerWordsCount > 0 && !reprocess) {
      const fillers = await getProjectFillers(projectId);
      const stats = await getFillerStats(projectId);
      return NextResponse.json({
        success: true,
        message: "Fillers already detected",
        fillers,
        stats,
      });
    }

    // Process fillers
    const result = await processProjectFillers(projectId, language);

    return NextResponse.json({
      success: true,
      message: `Detected ${result.stats.totalCount} filler words`,
      fillers: result.fillers,
      stats: result.stats,
    });
  } catch (error) {
    console.error("Error detecting fillers:", error);
    return NextResponse.json(
      { error: "Failed to detect fillers" },
      { status: 500 }
    );
  }
}

// PATCH - Mark fillers for removal
const markSchema = z.object({
  action: z.enum(["remove", "keep", "remove_all"]),
  fillerIds: z.array(z.string()).optional(),
  minConfidence: z.number().min(0).max(1).default(0.7),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { action, fillerIds, minConfidence } = markSchema.parse(body);

    switch (action) {
      case "remove":
        if (!fillerIds || fillerIds.length === 0) {
          return NextResponse.json(
            { error: "fillerIds required for remove action" },
            { status: 400 }
          );
        }
        await markFillersForRemoval(fillerIds, true);
        break;

      case "keep":
        if (!fillerIds || fillerIds.length === 0) {
          return NextResponse.json(
            { error: "fillerIds required for keep action" },
            { status: 400 }
          );
        }
        await markFillersForRemoval(fillerIds, false);
        break;

      case "remove_all":
        const count = await markAllFillersForRemoval(projectId, minConfidence);
        return NextResponse.json({
          success: true,
          message: `Marked ${count} fillers for removal`,
          removedCount: count,
        });
    }

    const stats = await getFillerStats(projectId);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error marking fillers:", error);
    return NextResponse.json(
      { error: "Failed to mark fillers" },
      { status: 500 }
    );
  }
}
