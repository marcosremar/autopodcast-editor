import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TemplateService } from "@/lib/templates/TemplateService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await params;

    const templateService = new TemplateService(db);
    const template = await templateService.getTemplateWithSections(templateId);

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: "Template not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error: any) {
    console.error("Error getting template:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get template",
      },
      { status: 500 }
    );
  }
}
