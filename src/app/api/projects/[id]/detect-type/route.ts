import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { projects } from "@/lib/db/schema";
import { ContentDetectionService } from "@/lib/ai/ContentDetectionService";
import { TemplateService } from "@/lib/templates/TemplateService";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Verify project exists and has transcription
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

    if (!project.transcription) {
      return NextResponse.json(
        {
          success: false,
          error: "Project must be transcribed before content detection",
        },
        { status: 400 }
      );
    }

    // Detect content type
    const contentDetection = new ContentDetectionService(db);

    const detection = await contentDetection.detectContentType(
      projectId,
      project.transcription
    );

    // Get suggested templates
    const suggestedTemplates = await contentDetection.suggestTemplates(
      detection.detectedType,
      detection.confidence
    );

    // Save detection
    await contentDetection.detectAndSave(projectId, project.transcription);

    // Get full template details for suggestions
    const templateService = new TemplateService(db);
    const templatesWithSections = [];

    for (const suggestion of suggestedTemplates) {
      const template = await templateService.getTemplateWithSections(
        suggestion.templateId
      );
      if (template) {
        templatesWithSections.push({
          template,
          matchScore: suggestion.matchScore,
          reason: suggestion.reason,
        });
      }
    }

    return NextResponse.json({
      success: true,
      detection: {
        detectedType: detection.detectedType,
        confidence: detection.confidence,
        reasoning: detection.reasoning,
        characteristics: detection.characteristics,
      },
      suggestedTemplates: templatesWithSections,
    });
  } catch (error: any) {
    console.error("Error detecting content type:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to detect content type",
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Get latest detection
    const contentDetection = new ContentDetectionService(db);

    const detection = await contentDetection.getLatestDetection(projectId);

    if (!detection) {
      return NextResponse.json(
        { success: false, error: "No detection found for this project" },
        { status: 404 }
      );
    }

    // Get suggested templates with full details
    const templateService = new TemplateService(db);
    const suggestedTemplates = detection.suggestedTemplates as any[];
    const templatesWithSections = [];

    if (suggestedTemplates && Array.isArray(suggestedTemplates)) {
      for (const suggestion of suggestedTemplates) {
        const template = await templateService.getTemplateWithSections(
          suggestion.templateId
        );
        if (template) {
          templatesWithSections.push({
            template,
            matchScore: suggestion.matchScore,
            reason: suggestion.reason,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      detection: {
        detectedType: detection.detectedType,
        confidence: detection.confidence,
        reasoning: detection.reasoning,
      },
      suggestedTemplates: templatesWithSections,
    });
  } catch (error: any) {
    console.error("Error getting detection:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get detection",
      },
      { status: 500 }
    );
  }
}
