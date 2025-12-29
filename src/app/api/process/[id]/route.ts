import { NextRequest, NextResponse } from "next/server";
import { db, projects } from "@/lib/db";
import { eq } from "drizzle-orm";
import { PodcastPipeline } from "@/services/pipeline";

// Mock services for MVP
// In production, these would be real implementations
import type {
  TranscriptionService,
  AnalysisService,
  ReorderService,
  StorageService,
} from "@/services/pipeline";

/**
 * POST /api/process/[id]
 * Start processing a project through the pipeline
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

    // Check if project exists
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (existingProject.length === 0) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const project = existingProject[0];

    // Check if project has audio
    if (!project.originalAudioUrl) {
      return NextResponse.json(
        { error: "Project has no audio file" },
        { status: 400 }
      );
    }

    // Check if already processing
    if (project.status === "transcribing" || project.status === "analyzing" || project.status === "reordering") {
      return NextResponse.json(
        { error: "Project is already being processed" },
        { status: 409 }
      );
    }

    // Initialize services (mock implementations for MVP)
    const transcriptionService = createTranscriptionService();
    const analysisService = createAnalysisService();
    const reorderService = createReorderService();
    const storageService = createStorageService();

    // Create pipeline
    const pipeline = new PodcastPipeline(
      transcriptionService,
      analysisService,
      reorderService,
      storageService
    );

    // Start processing in background
    // For MVP, we'll use a simple async call
    // In production, you'd use a job queue like BullMQ or AWS SQS
    processInBackground(pipeline, id);

    return NextResponse.json({
      message: "Processing started",
      projectId: id,
      status: "processing",
    });
  } catch (error) {
    console.error("Process error:", error);
    return NextResponse.json(
      { error: "Failed to start processing" },
      { status: 500 }
    );
  }
}

/**
 * Process the pipeline in the background
 */
async function processInBackground(pipeline: PodcastPipeline, projectId: string) {
  try {
    console.log(`[Pipeline] Starting processing for project ${projectId}`);
    await pipeline.process(projectId);
    console.log(`[Pipeline] Completed processing for project ${projectId}`);
  } catch (error) {
    console.error(`[Pipeline] Error processing project ${projectId}:`, error);
  }
}

/**
 * Create mock transcription service
 * In production, this would use OpenAI Whisper API or similar
 */
function createTranscriptionService(): TranscriptionService {
  return {
    async transcribe(audioUrl: string) {
      console.log(`[MockTranscription] Transcribing audio: ${audioUrl}`);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Return mock transcription
      return {
        text: "This is a mock transcription of the audio file. In production, this would be real transcription from Whisper API.",
        segments: [
          {
            start: 0,
            end: 30,
            text: "Welcome to this podcast episode. Today we're talking about AI and machine learning.",
          },
          {
            start: 30,
            end: 60,
            text: "First, let's discuss the basics of neural networks and how they work.",
          },
          {
            start: 60,
            end: 90,
            text: "Neural networks are inspired by the human brain and consist of interconnected nodes.",
          },
          {
            start: 90,
            end: 120,
            text: "Now let's look at some practical applications of machine learning in everyday life.",
          },
        ],
      };
    },
  };
}

/**
 * Create mock analysis service
 * In production, this would use Claude API
 */
function createAnalysisService(): AnalysisService {
  return {
    async analyzeSegment(text: string, context: string) {
      console.log(`[MockAnalysis] Analyzing segment: ${text.substring(0, 50)}...`);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Return mock analysis
      return {
        topic: "AI and Machine Learning",
        interestScore: Math.floor(Math.random() * 40) + 60, // 60-100
        clarityScore: Math.floor(Math.random() * 40) + 60, // 60-100
        isTangent: Math.random() > 0.8,
        isRepetition: Math.random() > 0.9,
        keyInsight: "Discussion of key concepts in AI",
        dependsOn: [],
        standalone: Math.random() > 0.3,
        hasFactualError: false,
        hasContradiction: false,
        isConfusing: Math.random() > 0.85,
        isIncomplete: false,
        needsRerecord: false,
      };
    },
  };
}

/**
 * Create mock reorder service
 * In production, this would use Claude API for narrative ordering
 */
function createReorderService(): ReorderService {
  return {
    async suggestOrder(segments) {
      console.log(`[MockReorder] Suggesting order for ${segments.length} segments`);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Return mock order (keep original order for now)
      return segments.map((segment, index) => ({
        segmentId: segment.id,
        suggestedOrder: index,
        reason: "Maintains logical flow",
      }));
    },
  };
}

/**
 * Create mock storage service
 * In production, this would use AWS S3 or similar
 */
function createStorageService(): StorageService {
  return {
    async uploadFile(file: Buffer, key: string, contentType: string) {
      console.log(`[MockStorage] Uploading file: ${key}`);
      return `https://mock-storage.example.com/${key}`;
    },

    async deleteFile(key: string) {
      console.log(`[MockStorage] Deleting file: ${key}`);
    },

    async getFileUrl(key: string) {
      return `https://mock-storage.example.com/${key}`;
    },
  };
}
