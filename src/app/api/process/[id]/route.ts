import { NextRequest, NextResponse } from "next/server";
import { db, projects, segments } from "@/lib/db";
import { eq } from "drizzle-orm";
import Groq from "groq-sdk";
import * as fs from "fs";
import * as path from "path";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_LLM_MODEL = "llama-3.3-70b-versatile";

interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

interface SegmentAnalysis {
  topic: string;
  interestScore: number;
  clarityScore: number;
  isTangent: boolean;
  isRepetition: boolean;
  keyInsight: string;
  hasFactualError: boolean;
  hasContradiction: boolean;
  isConfusing: boolean;
  isIncomplete: boolean;
  needsRerecord: boolean;
  rerecordSuggestion?: string;
}

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
    if (project.status === "transcribing" || project.status === "analyzing") {
      return NextResponse.json(
        { error: "Project is already being processed" },
        { status: 409 }
      );
    }

    // Check for Groq API key
    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Start processing in background
    processInBackground(id, project.originalAudioUrl);

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
async function processInBackground(projectId: string, audioUrl: string) {
  const groq = new Groq({ apiKey: GROQ_API_KEY });

  try {
    console.log(`[Pipeline] Starting processing for project ${projectId}`);

    // Update status to transcribing
    await db
      .update(projects)
      .set({ status: "transcribing", updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    // 1. Transcribe audio
    console.log(`[Pipeline] Transcribing audio...`);
    const transcription = await transcribeAudio(groq, audioUrl);
    console.log(`[Pipeline] Transcription complete: ${transcription.length} segments`);

    // Update project with transcription text
    const fullText = transcription.map(s => s.text).join(" ");
    await db
      .update(projects)
      .set({
        transcription: fullText,
        originalDuration: Math.ceil(transcription[transcription.length - 1]?.end || 0),
        status: "analyzing",
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    // 2. Analyze segments
    console.log(`[Pipeline] Analyzing segments...`);
    const context = transcription.slice(0, 5).map(s => s.text).join(" ").substring(0, 500);
    const previousTopics: string[] = [];
    const analyzedSegments: Array<TranscriptionSegment & { analysis: SegmentAnalysis }> = [];

    for (let i = 0; i < transcription.length; i++) {
      const seg = transcription[i];
      console.log(`[Pipeline] Analyzing segment ${i + 1}/${transcription.length}`);

      try {
        const analysis = await analyzeSegment(groq, seg, context, previousTopics.slice(-5));
        analyzedSegments.push({ ...seg, analysis });
        previousTopics.push(analysis.topic);
      } catch (error) {
        console.error(`[Pipeline] Error analyzing segment ${i}:`, error);
        analyzedSegments.push({
          ...seg,
          analysis: {
            topic: "Erro na analise",
            interestScore: 5,
            clarityScore: 5,
            isTangent: false,
            isRepetition: false,
            keyInsight: "",
            hasFactualError: false,
            hasContradiction: false,
            isConfusing: false,
            isIncomplete: false,
            needsRerecord: false,
          },
        });
      }

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 100));
    }

    // 3. Select best segments
    console.log(`[Pipeline] Selecting best segments...`);
    const selectedSegments = selectBestSegments(analyzedSegments);

    // 4. Delete existing segments for this project
    await db.delete(segments).where(eq(segments.projectId, projectId));

    // 5. Insert new segments
    console.log(`[Pipeline] Saving ${analyzedSegments.length} segments to database...`);
    for (let i = 0; i < analyzedSegments.length; i++) {
      const seg = analyzedSegments[i];
      const isSelected = selectedSegments.some(s => s.start === seg.start && s.end === seg.end);

      await db.insert(segments).values({
        projectId,
        startTime: seg.start,
        endTime: seg.end,
        text: seg.text,
        topic: seg.analysis.topic,
        interestScore: seg.analysis.interestScore,
        clarityScore: seg.analysis.clarityScore,
        keyInsight: seg.analysis.keyInsight,
        isSelected,
        order: isSelected ? selectedSegments.findIndex(s => s.start === seg.start) : null,
        analysis: seg.analysis as any,
        hasError: seg.analysis.hasFactualError || seg.analysis.hasContradiction,
        errorType: seg.analysis.hasFactualError ? "factual" : seg.analysis.hasContradiction ? "contradiction" : null,
        errorDetail: seg.analysis.hasFactualError ? "Erro factual detectado" : seg.analysis.hasContradiction ? "Contradicao detectada" : null,
      });
    }

    // 6. Update project status
    await db
      .update(projects)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    console.log(`[Pipeline] Processing complete for project ${projectId}`);
  } catch (error) {
    console.error(`[Pipeline] Error processing project ${projectId}:`, error);

    // Update project status to failed
    await db
      .update(projects)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(projects.id, projectId));
  }
}

/**
 * Transcribe audio using Groq Whisper
 */
async function transcribeAudio(groq: Groq, audioUrl: string): Promise<TranscriptionSegment[]> {
  // If it's a local file path, read it
  let audioData: Buffer;

  if (audioUrl.startsWith("file://")) {
    const filePath = audioUrl.replace("file://", "");
    audioData = fs.readFileSync(filePath);
  } else if (audioUrl.startsWith("http")) {
    // Fetch from URL
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    audioData = Buffer.from(arrayBuffer);
  } else {
    // Assume it's a relative path in public folder (e.g., /uploads/audio.mp3)
    // Remove leading slash if present for path.join to work correctly
    const relativePath = audioUrl.startsWith("/") ? audioUrl.slice(1) : audioUrl;
    const filePath = path.join(process.cwd(), "public", relativePath);
    console.log(`[Pipeline] Looking for audio at: ${filePath}`);
    if (fs.existsSync(filePath)) {
      audioData = fs.readFileSync(filePath);
    } else {
      throw new Error(`Audio file not found: ${filePath}`);
    }
  }

  const transcription = await groq.audio.transcriptions.create({
    file: new File([audioData], "audio.mp3", { type: "audio/mpeg" }),
    model: "whisper-large-v3",
    response_format: "verbose_json",
    language: "pt",
  });

  const result = transcription as unknown as {
    segments: Array<{ start: number; end: number; text: string }>;
  };

  return (result.segments || []).map((s) => ({
    start: Math.round(s.start * 100) / 100,
    end: Math.round(s.end * 100) / 100,
    text: s.text.trim(),
  }));
}

/**
 * Analyze a segment using Groq Llama
 */
async function analyzeSegment(
  groq: Groq,
  segment: TranscriptionSegment,
  context: string,
  previousTopics: string[]
): Promise<SegmentAnalysis> {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const prompt = `Voce e um editor de podcast experiente. Analise este segmento de audio transcrito.

CONTEXTO DO EPISODIO:
${context}

TOPICOS JA DISCUTIDOS:
${previousTopics.length > 0 ? previousTopics.join(", ") : "Nenhum ainda"}

SEGMENTO A ANALISAR (${formatTime(segment.start)} - ${formatTime(segment.end)}):
"${segment.text}"

Retorne APENAS um JSON valido:
{
  "topic": "topico principal (2-4 palavras)",
  "interestScore": 1-10,
  "clarityScore": 1-10,
  "isTangent": true/false,
  "isRepetition": true/false,
  "keyInsight": "insight principal ou vazio",
  "hasFactualError": true/false,
  "hasContradiction": true/false,
  "isConfusing": true/false,
  "isIncomplete": true/false,
  "needsRerecord": true/false,
  "rerecordSuggestion": "sugestao se precisar regravar"
}`;

  const response = await groq.chat.completions.create({
    model: GROQ_LLM_MODEL,
    max_tokens: 500,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices[0]?.message?.content || "{}";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("JSON not found in response");
  }

  return JSON.parse(jsonMatch[0]) as SegmentAnalysis;
}

/**
 * Select best segments for the final podcast
 */
function selectBestSegments(
  segments: Array<TranscriptionSegment & { analysis: SegmentAnalysis }>
): Array<TranscriptionSegment & { analysis: SegmentAnalysis }> {
  // Filter out tangents, repetitions, and errors
  const validSegments = segments.filter((seg) => {
    if (seg.analysis.isTangent) return false;
    if (seg.analysis.isRepetition) return false;
    if (seg.analysis.hasFactualError) return false;
    if (seg.analysis.hasContradiction) return false;
    if (seg.analysis.interestScore < 5) return false;
    return true;
  });

  // Sort by combined score
  const scored = validSegments.map((s) => ({
    ...s,
    score: s.analysis.interestScore * 0.6 + s.analysis.clarityScore * 0.4,
  }));
  scored.sort((a, b) => b.score - a.score);

  // Calculate target duration (aim for ~60% of original)
  const originalDuration = segments.reduce((sum, s) => sum + (s.end - s.start), 0);
  const targetDuration = originalDuration * 0.6;

  // Select segments up to target duration
  const selected: typeof scored = [];
  let totalDuration = 0;

  for (const seg of scored) {
    const duration = seg.end - seg.start;
    if (totalDuration + duration <= targetDuration) {
      selected.push(seg);
      totalDuration += duration;
    }
  }

  // Re-sort by original time order
  selected.sort((a, b) => a.start - b.start);

  return selected;
}
