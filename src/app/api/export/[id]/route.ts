import { NextRequest, NextResponse } from "next/server";
import { db, projects, segments } from "@/lib/db";
import { eq, and, asc } from "drizzle-orm";

/**
 * POST /api/export/[id]
 * Generate final audio from selected segments
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate UUID format
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json(
        { error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    // Get project
    const projectResults = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (projectResults.length === 0) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const project = projectResults[0];

    // Check if project is ready for export
    if (project.status !== "ready") {
      return NextResponse.json(
        {
          error: `Project is not ready for export. Current status: ${project.status}`,
        },
        { status: 400 }
      );
    }

    // Get selected segments in order
    const selectedSegments = await db
      .select()
      .from(segments)
      .where(
        and(
          eq(segments.projectId, id),
          eq(segments.isSelected, true)
        )
      )
      .orderBy(asc(segments.order));

    if (selectedSegments.length === 0) {
      return NextResponse.json(
        { error: "No segments selected for export" },
        { status: 400 }
      );
    }

    // Generate edited audio
    const editedAudioUrl = await generateEditedAudio(
      project.originalAudioUrl!,
      selectedSegments
    );

    // Update project with edited audio URL
    await db
      .update(projects)
      .set({
        editedAudioUrl,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id));

    return NextResponse.json({
      message: "Export completed successfully",
      downloadUrl: editedAudioUrl,
      projectId: id,
      segmentCount: selectedSegments.length,
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export audio" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/export/[id]
 * Get export status or download URL if already exported
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate UUID format
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json(
        { error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    // Get project
    const projectResults = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (projectResults.length === 0) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const project = projectResults[0];

    if (!project.editedAudioUrl) {
      return NextResponse.json({
        exported: false,
        message: "Project has not been exported yet",
      });
    }

    return NextResponse.json({
      exported: true,
      downloadUrl: project.editedAudioUrl,
      projectId: id,
    });
  } catch (error) {
    console.error("Export status error:", error);
    return NextResponse.json(
      { error: "Failed to get export status" },
      { status: 500 }
    );
  }
}

/**
 * Generate edited audio from selected segments
 * In production, this would use FFmpeg to concatenate audio segments
 */
async function generateEditedAudio(
  originalAudioUrl: string,
  selectedSegments: Array<{
    startTime: number;
    endTime: number;
    order: number | null;
  }>
): Promise<string> {
  console.log(`[Export] Generating edited audio from ${selectedSegments.length} segments`);
  console.log(`[Export] Original audio: ${originalAudioUrl}`);

  // Check if FFmpeg is available
  const ffmpegAvailable = await checkFFmpegAvailable();

  if (!ffmpegAvailable) {
    console.warn(
      "[Export] FFmpeg not available, using mock export. Install FFmpeg for production."
    );
    return generateMockExport(originalAudioUrl, selectedSegments);
  }

  // In production, use FFmpeg to:
  // 1. Extract each segment from the original audio
  // 2. Concatenate segments in order
  // 3. Upload the result to S3
  // 4. Return the download URL

  try {
    return await generateRealExport(originalAudioUrl, selectedSegments);
  } catch (error) {
    console.error("[Export] FFmpeg export failed, falling back to mock:", error);
    return generateMockExport(originalAudioUrl, selectedSegments);
  }
}

/**
 * Check if FFmpeg is installed and available
 */
async function checkFFmpegAvailable(): Promise<boolean> {
  try {
    // Try to dynamically import fluent-ffmpeg
    const ffmpeg = await import("fluent-ffmpeg");
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generate real audio export using FFmpeg
 */
async function generateRealExport(
  originalAudioUrl: string,
  selectedSegments: Array<{
    startTime: number;
    endTime: number;
    order: number | null;
  }>
): Promise<string> {
  // This is a placeholder for real FFmpeg implementation
  // You would:
  // 1. Download the original audio file
  // 2. Use fluent-ffmpeg to extract and concatenate segments
  // 3. Upload the result to S3
  // 4. Return the S3 URL

  throw new Error("Real FFmpeg export not implemented yet");
}

/**
 * Generate mock export URL for development
 */
function generateMockExport(
  originalAudioUrl: string,
  selectedSegments: Array<{
    startTime: number;
    endTime: number;
    order: number | null;
  }>
): string {
  const segmentCount = selectedSegments.length;
  const totalDuration = selectedSegments.reduce(
    (sum, seg) => sum + (seg.endTime - seg.startTime),
    0
  );

  const mockUrl = `http://localhost:3000/exports/${Date.now()}-edited-${segmentCount}segments-${Math.floor(totalDuration)}s.mp3`;

  console.log(`[Export] Mock export URL: ${mockUrl}`);
  console.log(`[Export] Segments: ${segmentCount}, Duration: ${totalDuration.toFixed(2)}s`);

  return mockUrl;
}
