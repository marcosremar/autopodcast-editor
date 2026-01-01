import { NextRequest, NextResponse } from "next/server";
import { db, projects, segments } from "@/lib/db";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import Groq from "groq-sdk";
import { aiCompleteJSON } from "@/lib/ai/AIService";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

interface WordTimestamp {
  word: string;
  start: number;
  end: number;
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
 * POST /api/projects/[id]/record
 * Upload and process a recorded audio segment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Validate UUID format
    if (!projectId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
      return NextResponse.json(
        { error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    // Check if project exists
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (existingProject.length === 0) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const durationStr = formData.get("duration") as string | null;
    const sectionId = formData.get("sectionId") as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const duration = durationStr ? parseInt(durationStr, 10) : 0;

    console.log(`[Record] Processing audio for project ${projectId}`);
    console.log(`[Record] File size: ${audioFile.size} bytes, duration: ${duration}s`);

    // Save audio file to public/uploads/recordings
    const uploadDir = path.join(process.cwd(), "public", "uploads", "recordings");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `recording_${projectId}_${timestamp}.webm`;
    const filePath = path.join(uploadDir, filename);
    const publicPath = `/uploads/recordings/${filename}`;

    // Write file
    const arrayBuffer = await audioFile.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    console.log(`[Record] Audio saved to: ${filePath}`);

    // Convert webm to mp3 for better compatibility with Whisper
    const mp3Filename = `recording_${projectId}_${timestamp}.mp3`;
    const mp3FilePath = path.join(uploadDir, mp3Filename);
    const mp3PublicPath = `/uploads/recordings/${mp3Filename}`;

    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      await execAsync(`ffmpeg -i "${filePath}" -vn -acodec libmp3lame -q:a 2 "${mp3FilePath}" -y`);
      console.log(`[Record] Converted to MP3: ${mp3FilePath}`);

      // Remove original webm
      fs.unlinkSync(filePath);
    } catch (ffmpegError) {
      console.warn("[Record] FFmpeg conversion failed, using original file:", ffmpegError);
      // Continue with original file
    }

    // Transcribe with Groq Whisper
    if (!GROQ_API_KEY) {
      // If no API key, create segment without transcription
      console.warn("[Record] No GROQ_API_KEY, skipping transcription");

      const segmentId = crypto.randomUUID();

      // Get current max order
      const existingSegments = await db
        .select()
        .from(segments)
        .where(eq(segments.projectId, projectId));

      const maxOrder = existingSegments.reduce((max, s) => Math.max(max, s.order || 0), 0);

      // Get last segment end time
      const lastEndTime = existingSegments.reduce((max, s) => Math.max(max, s.endTime), 0);

      await db.insert(segments).values({
        id: segmentId,
        projectId,
        startTime: lastEndTime,
        endTime: lastEndTime + duration,
        text: "[Audio gravado - transcricao pendente]",
        topic: "Gravacao",
        interestScore: 7,
        clarityScore: 7,
        isSelected: true,
        order: maxOrder + 1,
        analysis: {} as any,
      });

      return NextResponse.json({
        success: true,
        segmentId,
        message: "Audio saved without transcription (no API key)",
        audioUrl: fs.existsSync(mp3FilePath) ? mp3PublicPath : publicPath,
      });
    }

    // Transcribe audio
    const groq = new Groq({ apiKey: GROQ_API_KEY });

    console.log(`[Record] Transcribing audio...`);

    const audioBuffer = fs.readFileSync(fs.existsSync(mp3FilePath) ? mp3FilePath : filePath);

    const transcription = await groq.audio.transcriptions.create({
      file: new File([new Uint8Array(audioBuffer)], "audio.mp3", { type: "audio/mpeg" }),
      model: "whisper-large-v3",
      response_format: "verbose_json",
      language: "pt",
      timestamp_granularities: ["word", "segment"],
    });

    const result = transcription as unknown as {
      text: string;
      segments: Array<{ start: number; end: number; text: string }>;
      words?: Array<{ word: string; start: number; end: number }>;
    };

    console.log(`[Record] Transcription complete: ${result.text.substring(0, 100)}...`);

    // Get existing segments to determine start time
    const existingSegments = await db
      .select()
      .from(segments)
      .where(eq(segments.projectId, projectId));

    const lastEndTime = existingSegments.reduce((max, s) => Math.max(max, s.endTime), 0);
    const maxOrder = existingSegments.reduce((max, s) => Math.max(max, s.order || 0), 0);

    // Analyze the transcription
    let analysis: SegmentAnalysis = {
      topic: "Novo conteudo",
      interestScore: 7,
      clarityScore: 7,
      isTangent: false,
      isRepetition: false,
      keyInsight: "",
      hasFactualError: false,
      hasContradiction: false,
      isConfusing: false,
      isIncomplete: false,
      needsRerecord: false,
    };

    try {
      const analysisPrompt = `Voce e um editor de podcast experiente. Analise este segmento de audio gravado.

TRANSCRICAO:
"${result.text}"

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

      analysis = await aiCompleteJSON<SegmentAnalysis>("segment_analysis", analysisPrompt);
    } catch (analysisError) {
      console.warn("[Record] Analysis failed, using defaults:", analysisError);
    }

    // Calculate actual duration from transcription
    const transcribedDuration = result.segments?.length > 0
      ? result.segments[result.segments.length - 1].end
      : duration;

    // Extract word timestamps
    const wordTimestamps: WordTimestamp[] = (result.words || []).map(w => ({
      word: w.word,
      start: Math.round((lastEndTime + w.start) * 100) / 100,
      end: Math.round((lastEndTime + w.end) * 100) / 100,
    }));

    // Create segment
    const segmentId = crypto.randomUUID();

    await db.insert(segments).values({
      id: segmentId,
      projectId,
      startTime: lastEndTime,
      endTime: lastEndTime + transcribedDuration,
      text: result.text.trim(),
      topic: analysis.topic,
      interestScore: analysis.interestScore,
      clarityScore: analysis.clarityScore,
      keyInsight: analysis.keyInsight || null,
      isSelected: true,
      order: maxOrder + 1,
      analysis: analysis as any,
      hasError: analysis.hasFactualError || analysis.hasContradiction,
      errorType: analysis.hasFactualError ? "factual" : analysis.hasContradiction ? "contradiction" : null,
      wordTimestamps: wordTimestamps as any,
    });

    console.log(`[Record] Segment created: ${segmentId}`);

    return NextResponse.json({
      success: true,
      segmentId,
      text: result.text.trim(),
      topic: analysis.topic,
      duration: transcribedDuration,
      audioUrl: fs.existsSync(mp3FilePath) ? mp3PublicPath : publicPath,
      analysis,
    });

  } catch (error) {
    console.error("[Record] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process recording" },
      { status: 500 }
    );
  }
}
