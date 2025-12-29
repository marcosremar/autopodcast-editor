# RerecordModal Component Usage

## Overview

The `RerecordModal` component provides a fully functional audio recording interface for re-recording podcast segments that have issues detected by the AI analysis.

## Features

- Real-time audio recording using MediaRecorder API
- Live waveform visualization using Web Audio API
- Recording timer
- Playback controls for recorded audio
- Re-record functionality
- Display of original segment text and AI-detected issues
- Upload to storage and segment update

## Props

```tsx
interface RerecordModalProps {
  isOpen: boolean;              // Whether the modal is open
  segment: Segment | null;      // The segment to re-record
  onClose: () => void;          // Callback when modal is closed
  onConfirm: (                  // Callback when user confirms re-recording
    segmentId: string,
    audioBlob: Blob
  ) => Promise<void>;
}
```

## Usage Example

```tsx
"use client";

import { useState } from "react";
import { RerecordModal } from "@/components/editor";
import type { Segment } from "@/lib/db/schema";

export function EditorPage() {
  const [showRerecordModal, setShowRerecordModal] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);

  const handleRerecord = (segment: Segment) => {
    setSelectedSegment(segment);
    setShowRerecordModal(true);
  };

  const handleConfirmRerecord = async (segmentId: string, audioBlob: Blob) => {
    // 1. Upload the audio blob to storage (S3)
    const formData = new FormData();
    formData.append("audio", audioBlob, "rerecorded-audio.webm");
    formData.append("segmentId", segmentId);

    const uploadResponse = await fetch("/api/segments/rerecord", {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload re-recorded audio");
    }

    const { audioUrl } = await uploadResponse.json();

    // 2. Update the segment in the database
    await fetch(`/api/segments/${segmentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rerecordedAudioUrl: audioUrl,
        hasError: false,
        errorType: null,
        errorDetail: null,
      }),
    });

    // 3. Refresh the UI or update local state
    console.log("Segment re-recorded successfully!");
  };

  return (
    <div>
      {/* Your editor UI */}
      <SegmentList onRerecord={handleRerecord} />

      {/* RerecordModal */}
      <RerecordModal
        isOpen={showRerecordModal}
        segment={selectedSegment}
        onClose={() => {
          setShowRerecordModal(false);
          setSelectedSegment(null);
        }}
        onConfirm={handleConfirmRerecord}
      />
    </div>
  );
}
```

## Segment Structure

The component expects segments with the following structure:

```typescript
interface Segment {
  id: string;
  text: string;
  hasError: boolean;
  errorType?: "factual_error" | "contradiction" | "confusing" | "incomplete";
  errorDetail?: string;
  analysis?: {
    factualErrorDetail?: string;
    contradictionDetail?: string;
    confusingDetail?: string;
    incompleteDetail?: string;
    rerecordSuggestion?: string;
  };
  rerecordedAudioUrl?: string;
}
```

## Error Types Supported

The modal displays different information based on the error type:

1. **Factual Error** - Displays factual error details and suggestions
2. **Contradiction** - Shows contradiction details
3. **Confusing** - Explains what's confusing
4. **Incomplete** - Describes what's missing

## Recording Flow

1. User clicks "Start Recording" button
2. Browser requests microphone permission
3. Recording starts with live waveform visualization
4. Timer counts up showing recording duration
5. User clicks "Stop Recording" when done
6. User can preview the recording with play/pause controls
7. User can click "Record Again" to retry
8. User clicks "Confirm & Replace" to save the recording

## Browser Compatibility

Requires browsers that support:
- MediaRecorder API
- Web Audio API
- getUserMedia (for microphone access)

Supported in all modern browsers (Chrome, Firefox, Safari, Edge).

## Permissions

The component will request microphone permission when recording starts. Users must grant permission for recording to work.

## File Format

Recordings are saved as WebM format (audio/webm), which is well-supported and efficient for web delivery.

## Storage Integration

The `onConfirm` callback receives:
- `segmentId` - The ID of the segment being re-recorded
- `audioBlob` - The recorded audio as a Blob object

You should:
1. Upload the blob to your storage service (S3, etc.)
2. Get the URL of the uploaded audio
3. Update the segment in your database with the new audio URL
4. Clear the error flags on the segment

## Example API Route for Upload

```typescript
// src/app/api/segments/rerecord/route.ts
import { NextRequest, NextResponse } from "next/server";
import { uploadToS3 } from "@/lib/storage/s3";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const audioFile = formData.get("audio") as File;
  const segmentId = formData.get("segmentId") as string;

  // Upload to S3
  const audioUrl = await uploadToS3(audioFile, `rerecorded/${segmentId}.webm`);

  return NextResponse.json({ audioUrl });
}
```

## Styling

The component uses Tailwind CSS and matches the design system with:
- Dark mode support
- Consistent spacing and typography
- Accessible color contrast
- Responsive design

## Accessibility

- Keyboard navigation support
- Focus management
- ARIA labels on interactive elements
- Visual feedback for recording state
