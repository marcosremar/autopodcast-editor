import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, projects, segments } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

// Validation schema for creating a project
const createProjectSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  userId: z.string().uuid("Invalid user ID").optional(), // Optional for now (no auth)
  targetDuration: z.number().int().positive().optional(),
});

/**
 * GET /api/projects
 * List all projects for a user
 */
export async function GET(request: NextRequest) {
  try {
    // Get userId from query params (will come from auth later)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    // Build query and get projects ordered by creation date (newest first)
    let allProjects;

    if (userId) {
      allProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.createdAt));
    } else {
      allProjects = await db
        .select()
        .from(projects)
        .orderBy(desc(projects.createdAt));
    }

    return NextResponse.json({
      projects: allProjects,
      count: allProjects.length,
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Create a new project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = createProjectSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: result.error.issues,
        },
        { status: 400 }
      );
    }

    const { title, userId, targetDuration } = result.data;

    // Create project
    const newProject = await db
      .insert(projects)
      .values({
        title,
        userId: userId || null,
        targetDuration: targetDuration || null,
        status: "created",
      })
      .returning();

    return NextResponse.json(
      {
        project: newProject[0],
        message: "Project created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
