# Quick Reference Guide

## Authentication

### Client-Side Hook

```tsx
import { useAuth } from "@/components/auth";

const { user, isLoading, login, logout } = useAuth();
```

### Server-Side Session

```tsx
import { getSession } from "@/lib/auth/session";

const session = await getSession();
if (!session) {
  // Not authenticated
}
```

### Login Modal

```tsx
import { LoginModal } from "@/components/auth";

<LoginModal
  isOpen={showLogin}
  onClose={() => setShowLogin(false)}
  onSuccess={() => router.push("/dashboard")}
/>
```

## Re-recording Modal

### Basic Usage

```tsx
import { RerecordModal } from "@/components/editor";

<RerecordModal
  isOpen={showModal}
  segment={selectedSegment}
  onClose={() => setShowModal(false)}
  onConfirm={async (segmentId, audioBlob) => {
    // Upload and save
  }}
/>
```

### Complete Example

```tsx
const handleConfirm = async (segmentId: string, audioBlob: Blob) => {
  // 1. Upload to storage
  const formData = new FormData();
  formData.append("audio", audioBlob, "rerecorded.webm");
  formData.append("segmentId", segmentId);

  const res = await fetch("/api/segments/rerecord", {
    method: "POST",
    body: formData,
  });

  const { audioUrl } = await res.json();

  // 2. Update segment
  await fetch(`/api/segments/${segmentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rerecordedAudioUrl: audioUrl,
      hasError: false,
    }),
  });
};
```

## API Routes

### Authentication

```bash
# Login
POST /api/auth/login
Body: { "email": "user@example.com" }

# Logout
POST /api/auth/logout

# Get current user
GET /api/auth/me
```

### Re-recording (To Implement)

```bash
# Upload re-recorded audio
POST /api/segments/rerecord
FormData: { audio: File, segmentId: string }

# Update segment
PATCH /api/segments/:id
Body: { rerecordedAudioUrl: string, hasError: false }
```

## Protected Routes

```typescript
// Automatically protected by middleware
/dashboard
/editor
/editor/:id

// Public routes
/
/api/waitlist
/api/auth/*
```

## Database Schema

```typescript
// Segment with re-recording support
interface Segment {
  id: string;
  text: string;
  hasError: boolean;
  errorType?: "factual_error" | "contradiction" | "confusing" | "incomplete";
  errorDetail?: string;
  rerecordedAudioUrl?: string;
  analysis?: {
    factualErrorDetail?: string;
    contradictionDetail?: string;
    confusingDetail?: string;
    incompleteDetail?: string;
    rerecordSuggestion?: string;
  };
}

// User session
interface Session {
  userId: string;
  email: string;
  name?: string;
  plan?: string;
}
```

## Environment Variables

```bash
# Required for database
DATABASE_URL=postgresql://...

# Optional for production
NODE_ENV=production
```

## Common Patterns

### Check Authentication in Server Component

```tsx
import { getSession } from "@/lib/auth/session";

export default async function Page() {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  return <div>Authenticated content</div>;
}
```

### Check Authentication in Client Component

```tsx
"use client";

import { useAuth } from "@/components/auth";

export function MyComponent() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Loading />;
  if (!user) return <LoginPrompt />;

  return <div>Protected content</div>;
}
```

### Trigger Re-recording

```tsx
const segments = [...]; // Your segments

const handleRerecordClick = (segment: Segment) => {
  setSelectedSegment(segment);
  setShowRerecordModal(true);
};

return (
  <>
    {segments.map(segment => (
      <div key={segment.id}>
        {segment.hasError && (
          <button onClick={() => handleRerecordClick(segment)}>
            Re-record
          </button>
        )}
      </div>
    ))}

    <RerecordModal
      isOpen={showRerecordModal}
      segment={selectedSegment}
      onClose={() => setShowRerecordModal(false)}
      onConfirm={handleConfirmRerecord}
    />
  </>
);
```

## Imports

```tsx
// Authentication
import { useAuth } from "@/components/auth";
import { LoginModal } from "@/components/auth";
import { getSession, setSession, clearSession } from "@/lib/auth/session";

// Re-recording
import { RerecordModal } from "@/components/editor";

// Types
import type { Segment } from "@/lib/db/schema";
```

## Browser APIs Used

### Re-recording Modal

```typescript
// Request microphone access
navigator.mediaDevices.getUserMedia({ audio: true });

// MediaRecorder for recording
new MediaRecorder(stream);

// Web Audio API for visualization
new AudioContext();
context.createAnalyser();

// Canvas for waveform
canvas.getContext("2d");
```

## TypeScript Tips

```typescript
// Type-safe segment prop
segment: Segment | null

// Type-safe audio blob
audioBlob: Blob

// Type-safe session
const session: Session | null = await getSession();

// Type-safe auth hook
const { user } = useAuth();
// user is User | null
```

## Troubleshooting

### Can't access protected route
- Check if logged in: `useAuth()` or check cookies
- Verify middleware is running
- Check session hasn't expired

### Re-recording not working
- Grant microphone permission
- Check browser support (MediaRecorder API)
- Look for console errors
- Verify segment has error data

### Session not persisting
- Check cookies are enabled
- Verify `httpOnly` cookie is set
- Check session expiration time
- Ensure database connection works

## Documentation

- **Authentication**: `src/components/auth/USAGE.md`
- **Re-recording**: `src/components/editor/USAGE.md`
- **Complete Guide**: `AUTHENTICATION_AND_RERECORD.md`
- **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md`
