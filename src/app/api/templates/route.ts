import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TemplateService } from "@/lib/templates/TemplateService";

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category") || undefined;
    const isSystem = searchParams.get("isSystem");
    const userId = searchParams.get("userId") || undefined;

    const templateService = new TemplateService(db);

    // Build filters
    const filters: any = {};

    if (category) {
      filters.category = category;
    }

    if (isSystem !== null) {
      filters.isSystem = isSystem === "true";
    }

    // If userId is provided, include their templates
    if (userId) {
      filters.userId = userId;
    }

    const templates = await templateService.listTemplates(filters);

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error: any) {
    console.error("Error listing templates:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to list templates",
      },
      { status: 500 }
    );
  }
}
