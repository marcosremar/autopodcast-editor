/**
 * Show Notes API
 * GET - Get show notes for a project
 * POST - Generate show notes
 * PUT - Update show notes
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { showNotesService } from "@/lib/ai/show-notes-service";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET - Get show notes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format"); // markdown, text, or json (default)

    const notes = await showNotesService.getShowNotes(projectId);

    if (!notes) {
      return NextResponse.json(
        { error: "Show notes not found. Generate them first." },
        { status: 404 }
      );
    }

    // Export in requested format
    if (format === "markdown") {
      const markdown = showNotesService.exportMarkdown(notes);
      return new NextResponse(markdown, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="show-notes-${projectId}.md"`,
        },
      });
    }

    if (format === "text") {
      const text = showNotesService.exportPlainText(notes);
      return new NextResponse(text, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="show-notes-${projectId}.txt"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      showNotes: notes,
    });
  } catch (error) {
    console.error("Error getting show notes:", error);
    return NextResponse.json(
      { error: "Failed to get show notes" },
      { status: 500 }
    );
  }
}

// POST - Generate show notes
const generateSchema = z.object({
  regenerate: z.boolean().default(false),
  section: z.enum(["summary", "chapters", "keyPoints"]).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { regenerate, section } = generateSchema.parse(body);

    // Check if project exists
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if show notes already exist
    const existing = await showNotesService.getShowNotes(projectId);

    if (existing && !regenerate && !section) {
      return NextResponse.json({
        success: true,
        message: "Show notes already exist",
        showNotes: existing,
      });
    }

    let notes;

    if (section && existing) {
      // Regenerate specific section
      notes = await showNotesService.regenerateSection(projectId, section);
    } else {
      // Generate full show notes
      notes = await showNotesService.generate(projectId);
    }

    return NextResponse.json({
      success: true,
      message: section
        ? `Regenerated ${section}`
        : "Show notes generated successfully",
      showNotes: notes,
    });
  } catch (error) {
    console.error("Error generating show notes:", error);
    return NextResponse.json(
      { error: "Failed to generate show notes" },
      { status: 500 }
    );
  }
}

// PUT - Update show notes manually
const updateSchema = z.object({
  summary: z.string().optional(),
  chapters: z.array(z.object({
    title: z.string(),
    timestamp: z.number(),
    description: z.string().optional(),
  })).optional(),
  keyPoints: z.array(z.string()).optional(),
  guestInfo: z.array(z.object({
    name: z.string(),
    bio: z.string().optional(),
    role: z.string().optional(),
  })).optional(),
  links: z.array(z.string()).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const updates = updateSchema.parse(body);

    // Check if show notes exist
    const existing = await showNotesService.getShowNotes(projectId);

    if (!existing) {
      return NextResponse.json(
        { error: "Show notes not found. Generate them first." },
        { status: 404 }
      );
    }

    const updated = await showNotesService.updateShowNotes(projectId, updates);

    return NextResponse.json({
      success: true,
      showNotes: updated,
    });
  } catch (error) {
    console.error("Error updating show notes:", error);
    return NextResponse.json(
      { error: "Failed to update show notes" },
      { status: 500 }
    );
  }
}
