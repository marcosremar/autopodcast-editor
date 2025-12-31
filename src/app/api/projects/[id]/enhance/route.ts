/**
 * Audio Enhancement API
 * GET - Get enhancement status and settings
 * POST - Apply audio enhancements
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  audioEnhancementService,
  ENHANCEMENT_PRESETS,
} from "@/lib/audio/enhancement-service";
import { db } from "@/lib/db";
import { projects, audioEnhancements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import path from "path";
import os from "os";

// GET - Get enhancement status and available presets
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Get project
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get applied enhancements
    const enhancements = await db
      .select()
      .from(audioEnhancements)
      .where(eq(audioEnhancements.projectId, projectId));

    return NextResponse.json({
      success: true,
      isEnhanced: project.audioEnhanced,
      enhancedAudioUrl: project.enhancedAudioUrl,
      currentSettings: project.enhancementSettings,
      appliedEnhancements: enhancements,
      presets: Object.entries(ENHANCEMENT_PRESETS).map(([key, preset]) => ({
        id: key,
        name: preset.name,
        description: preset.description,
        settings: preset.settings,
      })),
    });
  } catch (error) {
    console.error("Error getting enhancement status:", error);
    return NextResponse.json(
      { error: "Failed to get enhancement status" },
      { status: 500 }
    );
  }
}

// POST - Apply audio enhancements
const enhanceSchema = z.object({
  preset: z.enum(["podcast_standard", "voice_clarity", "broadcast_ready", "minimal"]).optional(),
  settings: z.object({
    normalize: z.object({
      enabled: z.boolean(),
      targetLufs: z.number().min(-30).max(-10),
    }).optional(),
    denoise: z.object({
      enabled: z.boolean(),
      strength: z.enum(["light", "medium", "aggressive"]),
    }).optional(),
    eq: z.object({
      enabled: z.boolean(),
      preset: z.enum(["voice", "clarity", "warmth", "custom"]),
      customBands: z.array(z.number()).optional(),
    }).optional(),
    compress: z.object({
      enabled: z.boolean(),
      preset: z.enum(["light", "medium", "broadcast"]),
    }).optional(),
    removeFillers: z.boolean().optional(),
  }).optional(),
  preview: z.boolean().default(false),
  previewStart: z.number().default(0),
  previewDuration: z.number().default(10),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { preset, settings, preview, previewStart, previewDuration } = enhanceSchema.parse(body);

    // Get project
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!project.originalAudioUrl) {
      return NextResponse.json(
        { error: "No audio file available" },
        { status: 400 }
      );
    }

    // Determine settings to use
    let enhancementSettings = settings;
    if (preset && !settings) {
      const presetConfig = ENHANCEMENT_PRESETS[preset as keyof typeof ENHANCEMENT_PRESETS];
      if (presetConfig) {
        enhancementSettings = presetConfig.settings;
      }
    }

    if (!enhancementSettings) {
      enhancementSettings = ENHANCEMENT_PRESETS.podcast_standard.settings;
    }

    // Get audio path
    const audioPath = project.originalAudioUrl.startsWith("/")
      ? path.join(process.cwd(), "public", project.originalAudioUrl)
      : project.originalAudioUrl;

    if (preview) {
      // Generate preview
      const result = await audioEnhancementService.preview(
        { inputPath: audioPath, ...enhancementSettings },
        previewStart,
        previewDuration
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Preview failed" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        preview: true,
        previewUrl: result.previewPath,
        duration: result.duration,
      });
    } else {
      // Apply full enhancement
      const outputPath = path.join(
        process.cwd(),
        "public",
        "uploads",
        `enhanced-${projectId}-${Date.now()}.mp3`
      );

      const result = await audioEnhancementService.enhance({
        inputPath: audioPath,
        outputPath,
        ...enhancementSettings,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Enhancement failed" },
          { status: 500 }
        );
      }

      // Update project
      const enhancedUrl = `/uploads/${path.basename(outputPath)}`;
      await db
        .update(projects)
        .set({
          audioEnhanced: true,
          enhancementSettings: enhancementSettings,
          enhancedAudioUrl: enhancedUrl,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));

      // Save enhancement record
      await db.insert(audioEnhancements).values({
        projectId,
        enhancementType: preset || "custom",
        settings: enhancementSettings,
        isApplied: true,
        appliedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        enhanced: true,
        enhancedAudioUrl: enhancedUrl,
        appliedFilters: result.appliedFilters,
      });
    }
  } catch (error) {
    console.error("Error applying enhancements:", error);
    return NextResponse.json(
      { error: "Failed to apply enhancements" },
      { status: 500 }
    );
  }
}

// DELETE - Remove enhancements (revert to original)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    await db
      .update(projects)
      .set({
        audioEnhanced: false,
        enhancementSettings: null,
        enhancedAudioUrl: null,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    return NextResponse.json({
      success: true,
      message: "Enhancements removed",
    });
  } catch (error) {
    console.error("Error removing enhancements:", error);
    return NextResponse.json(
      { error: "Failed to remove enhancements" },
      { status: 500 }
    );
  }
}
