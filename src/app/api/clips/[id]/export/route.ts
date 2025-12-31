/**
 * Clip Export API
 * POST - Export a clip to video
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { socialClipService } from "@/lib/clips/social-clip-service";
import { db } from "@/lib/db";
import { socialClips, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import path from "path";

const exportSchema = z.object({
  format: z.enum(["9:16", "1:1", "16:9"]).default("9:16"),
  addCaptions: z.boolean().default(true),
  captionStyle: z.enum(["animated", "static"]).default("animated"),
  backgroundColor: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().min(12).max(72).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clipId } = await params;
    const body = await request.json();
    const options = exportSchema.parse(body);

    // Get clip
    const [clip] = await db
      .select()
      .from(socialClips)
      .where(eq(socialClips.id, clipId));

    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    // Get project for audio file
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, clip.projectId));

    if (!project || !project.originalAudioUrl) {
      return NextResponse.json(
        { error: "Project audio not found" },
        { status: 404 }
      );
    }

    // Update clip status to processing
    await db
      .update(socialClips)
      .set({ status: "processing" })
      .where(eq(socialClips.id, clipId));

    // Get audio path
    const audioPath = project.originalAudioUrl.startsWith("/")
      ? path.join(process.cwd(), "public", project.originalAudioUrl)
      : project.originalAudioUrl;

    // Generate output path
    const outputDir = path.join(process.cwd(), "public", "exports", "clips");
    const outputPath = path.join(
      outputDir,
      `clip-${clipId}-${Date.now()}.mp4`
    );

    // Export clip
    const result = await socialClipService.exportClip(clipId, audioPath, {
      ...options,
      outputPath,
    });

    if (!result.success) {
      // Revert status
      await db
        .update(socialClips)
        .set({ status: "pending" })
        .where(eq(socialClips.id, clipId));

      return NextResponse.json(
        { error: result.error || "Export failed" },
        { status: 500 }
      );
    }

    // Update clip with URL
    const clipUrl = `/exports/clips/${path.basename(outputPath)}`;
    await db
      .update(socialClips)
      .set({
        status: "ready",
        clipUrl,
        format: options.format,
        captionsEnabled: options.addCaptions,
        captionStyle: options.captionStyle,
      })
      .where(eq(socialClips.id, clipId));

    return NextResponse.json({
      success: true,
      clipUrl,
      duration: result.duration,
      format: options.format,
    });
  } catch (error) {
    console.error("Error exporting clip:", error);
    return NextResponse.json(
      { error: "Failed to export clip" },
      { status: 500 }
    );
  }
}

// GET - Get export status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clipId } = await params;

    const [clip] = await db
      .select()
      .from(socialClips)
      .where(eq(socialClips.id, clipId));

    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      status: clip.status,
      clipUrl: clip.clipUrl,
      format: clip.format,
    });
  } catch (error) {
    console.error("Error getting clip status:", error);
    return NextResponse.json(
      { error: "Failed to get clip status" },
      { status: 500 }
    );
  }
}
