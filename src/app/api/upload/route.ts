import { NextRequest, NextResponse } from "next/server";
import { db, projects } from "@/lib/db";

// Allowed audio file types
const ALLOWED_TYPES = [
  "audio/mpeg", // mp3
  "audio/wav", // wav
  "audio/x-wav", // wav alternative
  "audio/mp4", // m4a
  "audio/x-m4a", // m4a alternative
];

const ALLOWED_EXTENSIONS = ["mp3", "wav", "m4a"];

// Maximum file size: 500MB
const MAX_FILE_SIZE = 500 * 1024 * 1024;

/**
 * POST /api/upload
 * Handle audio file upload
 */
export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const userId = formData.get("userId") as string | null;
    const targetDuration = formData.get("targetDuration") as string | null;
    const language = (formData.get("language") as string | null) || "pt";

    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (!fileExtension || !ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type) && file.type !== "") {
      // Some browsers don't set the MIME type correctly, so we allow empty type if extension is valid
      if (file.type !== "") {
        return NextResponse.json(
          {
            error: `Invalid MIME type. Allowed types: ${ALLOWED_TYPES.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        },
        { status: 400 }
      );
    }

    // Validate title
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get audio duration (we'll need a library like fluent-ffmpeg for this in production)
    // For now, we'll set it to null and update it during transcription
    const originalDuration = null;

    // Upload to S3 (or local storage for MVP)
    const audioUrl = await uploadAudioFile(buffer, file.name, file.type);

    // Validate language
    const validLanguages = ["pt", "en", "es"];
    const validatedLanguage = validLanguages.includes(language) ? language : "pt";

    // Create project in database
    const newProject = await db
      .insert(projects)
      .values({
        title: title.trim(),
        userId: userId || null,
        status: "uploaded",
        originalAudioUrl: audioUrl,
        originalDuration,
        targetDuration: targetDuration ? parseInt(targetDuration, 10) : null,
        language: validatedLanguage,
      })
      .returning();

    return NextResponse.json(
      {
        projectId: newProject[0].id,
        project: newProject[0],
        message: "File uploaded successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

/**
 * Upload audio file to storage
 * For MVP, this uses local filesystem or in-memory storage
 * In production, this should use S3 or similar
 */
async function uploadAudioFile(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  // Check if S3 credentials are configured
  const s3Bucket = process.env.AWS_S3_BUCKET;
  const s3Region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (s3Bucket && s3Region && accessKeyId && secretAccessKey) {
    // Use S3 for production
    return await uploadToS3(buffer, filename, contentType, s3Bucket, s3Region);
  } else {
    // Use local storage for development
    console.warn(
      "[Upload] S3 not configured, using local storage. Set AWS_* environment variables for production."
    );

    // Save to local filesystem
    const fs = await import("fs/promises");
    const path = await import("path");

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const uniqueFilename = `${Date.now()}-${filename}`;
    const filePath = path.join(uploadsDir, uniqueFilename);

    // Write file to disk
    await fs.writeFile(filePath, buffer);

    // Return URL path (relative to public directory)
    const url = `/uploads/${uniqueFilename}`;
    console.log(`[Upload] File saved to: ${filePath}`);
    console.log(`[Upload] URL: ${url}`);
    return url;
  }
}

/**
 * Upload file to AWS S3
 */
async function uploadToS3(
  buffer: Buffer,
  filename: string,
  contentType: string,
  bucket: string,
  region: string
): Promise<string> {
  try {
    // Dynamic import to avoid loading AWS SDK if not needed
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

    const s3Client = new S3Client({ region });

    // Generate unique key
    const key = `audio/${Date.now()}-${filename}`;

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    // Return public URL
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    return url;
  } catch (error) {
    console.error("S3 upload error:", error);
    throw new Error("Failed to upload to S3");
  }
}
