# AutoPodcast Editor - API Documentation

This document describes the API routes and pipeline architecture for the AutoPodcast editor.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Pipeline Service](#pipeline-service)
- [API Routes](#api-routes)
- [Development Notes](#development-notes)

## Architecture Overview

The AutoPodcast editor is built with Next.js 14 and uses a modular pipeline architecture:

```
Upload Audio → Transcribe → Analyze Segments → Reorder → Export
```

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Drizzle ORM
- **Storage**: AWS S3 (with local fallback for development)
- **AI Services**:
  - OpenAI Whisper (transcription)
  - Anthropic Claude (analysis & reordering)

## Pipeline Service

### Location
`/Users/marcos/Documents/projects/microsass/editor-podcast/src/services/pipeline.ts`

### PodcastPipeline Class

The main pipeline orchestrator that processes audio files through the entire workflow.

```typescript
class PodcastPipeline {
  constructor(
    transcription: TranscriptionService,
    analysis: AnalysisService,
    reorder: ReorderService,
    storage: StorageService,
    database = db
  )

  async process(projectId: string): Promise<void>
}
```

### Pipeline Steps

1. **Transcribing** (`status: 'transcribing'`)
   - Gets audio URL from project
   - Transcribes audio using Whisper API
   - Saves full transcription to database

2. **Chunking**
   - Breaks transcription into 30-60 second segments
   - Ensures coherent breaks between thoughts

3. **Analyzing** (`status: 'analyzing'`)
   - Analyzes each segment with Claude
   - Extracts: topic, interest score, clarity score, key insights
   - Detects: tangents, repetitions, errors, contradictions

4. **Selecting**
   - Scores segments based on quality metrics
   - Selects best segments to meet target duration
   - Filters out low-quality content

5. **Reordering** (`status: 'reordering'`)
   - Suggests optimal narrative order
   - Maintains logical flow and dependencies

6. **Saving**
   - Stores segments in database with analysis
   - Marks project as `ready`

7. **Error Handling**
   - Updates status to `error` on failure
   - Logs detailed error information

### Service Interfaces

```typescript
interface TranscriptionService {
  transcribe(audioUrl: string): Promise<TranscriptionResult>
}

interface AnalysisService {
  analyzeSegment(text: string, context: string): Promise<SegmentAnalysis>
}

interface ReorderService {
  suggestOrder(segments: SegmentWithAnalysis[]): Promise<OrderSuggestion[]>
}

interface StorageService {
  uploadFile(file: Buffer, key: string, contentType: string): Promise<string>
  deleteFile(key: string): Promise<void>
  getFileUrl(key: string): Promise<string>
}
```

## API Routes

### 1. Projects API

#### GET /api/projects
List all projects for a user.

**Location**: `/Users/marcos/Documents/projects/microsass/editor-podcast/src/app/api/projects/route.ts`

**Query Parameters**:
- `userId` (optional): Filter projects by user ID

**Response**:
```json
{
  "projects": [
    {
      "id": "uuid",
      "title": "My Podcast Episode",
      "status": "ready",
      "originalAudioUrl": "https://...",
      "originalDuration": 3600,
      "targetDuration": 1800,
      "createdAt": "2025-12-29T...",
      "updatedAt": "2025-12-29T..."
    }
  ],
  "count": 1
}
```

#### POST /api/projects
Create a new project.

**Request Body**:
```json
{
  "title": "My Podcast Episode",
  "userId": "uuid (optional)",
  "targetDuration": 1800
}
```

**Response** (201):
```json
{
  "project": { /* project object */ },
  "message": "Project created successfully"
}
```

### 2. Single Project API

**Location**: `/Users/marcos/Documents/projects/microsass/editor-podcast/src/app/api/projects/[id]/route.ts`

#### GET /api/projects/:id
Get a project with all its segments.

**Response**:
```json
{
  "project": { /* project object */ },
  "segments": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "startTime": 0.0,
      "endTime": 30.5,
      "text": "Welcome to the podcast...",
      "interestScore": 85,
      "clarityScore": 90,
      "topic": "Introduction",
      "keyInsight": "Sets the stage for discussion",
      "isSelected": true,
      "order": 0,
      "analysis": { /* full analysis object */ }
    }
  ]
}
```

#### PATCH /api/projects/:id
Update project properties, selected segments, or segment order.

**Request Body**:
```json
{
  "title": "Updated Title (optional)",
  "targetDuration": 1800,
  "selectedSegments": ["segment-uuid-1", "segment-uuid-2"],
  "segmentOrder": [
    { "segmentId": "uuid-1", "order": 0 },
    { "segmentId": "uuid-2", "order": 1 }
  ]
}
```

**Response**:
```json
{
  "project": { /* updated project */ },
  "segments": [ /* updated segments */ ],
  "message": "Project updated successfully"
}
```

#### DELETE /api/projects/:id
Delete a project and all its segments (cascade).

**Response**:
```json
{
  "message": "Project deleted successfully"
}
```

### 3. Upload API

**Location**: `/Users/marcos/Documents/projects/microsass/editor-podcast/src/app/api/upload/route.ts`

#### POST /api/upload
Upload an audio file and create a project.

**Request**: Multipart form data
- `file`: Audio file (mp3, wav, m4a)
- `title`: Project title
- `userId` (optional): User ID
- `targetDuration` (optional): Target duration in seconds

**Validation**:
- File types: mp3, wav, m4a
- Max size: 500MB

**Response** (201):
```json
{
  "projectId": "uuid",
  "project": { /* project object */ },
  "message": "File uploaded successfully"
}
```

**Error Responses**:
- 400: Invalid file type or size
- 500: Upload failed

### 4. Process API

**Location**: `/Users/marcos/Documents/projects/microsass/editor-podcast/src/app/api/process/[id]/route.ts`

#### POST /api/process/:id
Start processing a project through the pipeline.

**Response**:
```json
{
  "message": "Processing started",
  "projectId": "uuid",
  "status": "processing"
}
```

**Error Responses**:
- 404: Project not found
- 400: Project has no audio file
- 409: Project is already being processed

**Notes**:
- Processing runs asynchronously in the background
- Project status updates throughout the pipeline
- Check project status via GET /api/projects/:id

### 5. Export API

**Location**: `/Users/marcos/Documents/projects/microsass/editor-podcast/src/app/api/export/[id]/route.ts`

#### POST /api/export/:id
Generate final edited audio from selected segments.

**Response**:
```json
{
  "message": "Export completed successfully",
  "downloadUrl": "https://...",
  "projectId": "uuid",
  "segmentCount": 5
}
```

**Error Responses**:
- 404: Project not found
- 400: Project not ready for export or no segments selected

#### GET /api/export/:id
Check export status or get download URL.

**Response**:
```json
{
  "exported": true,
  "downloadUrl": "https://...",
  "projectId": "uuid"
}
```

Or if not exported yet:
```json
{
  "exported": false,
  "message": "Project has not been exported yet"
}
```

## Development Notes

### Status Flow

```
created → uploaded → transcribing → analyzing → reordering → ready → (exported)
                                                                  ↓
                                                              error
```

### Mock Services

For MVP development, the pipeline uses mock services:

1. **Mock Transcription**: Returns sample segments
2. **Mock Analysis**: Generates random scores and analysis
3. **Mock Reorder**: Maintains original order
4. **Mock Storage**: Returns local URLs
5. **Mock Export**: Returns mock download URL

### Production Implementation

To move to production, implement:

1. **Real Transcription**: Use OpenAI Whisper API
   ```typescript
   const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
   const transcription = await openai.audio.transcriptions.create({
     file: audioFile,
     model: "whisper-1",
     response_format: "verbose_json",
   });
   ```

2. **Real Analysis**: Use Anthropic Claude API
   ```typescript
   const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
   const message = await anthropic.messages.create({
     model: "claude-3-5-sonnet-20241022",
     messages: [{ role: "user", content: prompt }],
   });
   ```

3. **Real Storage**: Use AWS S3
   - Set environment variables: `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
   - Install `@aws-sdk/client-s3`

4. **Real Export**: Use FFmpeg
   - Install `fluent-ffmpeg` package
   - Install FFmpeg system binary
   - Implement audio concatenation

5. **Background Jobs**: Use a job queue
   - BullMQ + Redis
   - AWS SQS
   - Vercel Queue

### Environment Variables

Required for production:

```bash
# Database
DATABASE_URL=postgresql://...

# AWS S3 Storage
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# OpenAI Whisper
OPENAI_API_KEY=sk-...

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-...
```

### Error Handling

All routes implement proper error handling:
- Input validation with Zod
- Try-catch blocks
- Appropriate HTTP status codes
- Detailed error messages in development
- Sanitized errors in production

### Testing

To test the API:

1. Upload a file:
   ```bash
   curl -X POST http://localhost:3000/api/upload \
     -F "file=@podcast.mp3" \
     -F "title=Test Episode"
   ```

2. Start processing:
   ```bash
   curl -X POST http://localhost:3000/api/process/{projectId}
   ```

3. Check status:
   ```bash
   curl http://localhost:3000/api/projects/{projectId}
   ```

4. Export audio:
   ```bash
   curl -X POST http://localhost:3000/api/export/{projectId}
   ```

## File Structure

```
src/
├── app/
│   └── api/
│       ├── projects/
│       │   ├── route.ts              # List & create projects
│       │   └── [id]/
│       │       └── route.ts          # Get, update, delete project
│       ├── upload/
│       │   └── route.ts              # Upload audio files
│       ├── process/
│       │   └── [id]/
│       │       └── route.ts          # Start pipeline processing
│       └── export/
│           └── [id]/
│               └── route.ts          # Export edited audio
└── services/
    └── pipeline.ts                   # Main pipeline orchestration
```

## Next Steps

1. Implement real transcription service with OpenAI Whisper
2. Implement real analysis service with Claude
3. Implement real reorder service with Claude
4. Set up S3 for audio storage
5. Implement FFmpeg export functionality
6. Add authentication (NextAuth.js or Clerk)
7. Add rate limiting and usage tracking
8. Set up background job processing
9. Add webhooks for status updates
10. Implement real-time progress updates (WebSockets or polling)
