# AutoPodcast Authentication & Re-recording Implementation

This document provides an overview of the authentication system and re-recording modal implementation for the AutoPodcast editor.

## Table of Contents

1. [Authentication System](#authentication-system)
2. [Re-recording Modal](#re-recording-modal)
3. [File Structure](#file-structure)
4. [Quick Start](#quick-start)
5. [API Reference](#api-reference)

---

## Authentication System

### Overview

The authentication system provides simple, session-based authentication using HTTP-only cookies. For the MVP, it uses auto-login (no email verification), but is designed to be easily upgraded to magic link authentication in production.

### Features

- Session-based authentication with HTTP-only cookies
- 30-day session duration
- Protected routes via middleware
- Auto-login for MVP (easily upgradeable to magic links)
- User management with database integration
- React context for client-side authentication state

### Components

#### 1. Session Management (`src/lib/auth/session.ts`)

Core authentication utilities:

```typescript
// Get current session
const session = await getSession();

// Set a new session
await setSession({
  userId: "uuid",
  email: "user@example.com",
  name: "User Name",
  plan: "free"
});

// Clear session
await clearSession();

// Get or create user
const user = await getOrCreateUser("user@example.com", "User Name");
```

#### 2. API Routes

- **POST /api/auth/login** - Login endpoint (MVP auto-login)
- **POST /api/auth/logout** - Logout endpoint
- **GET /api/auth/me** - Get current user info

#### 3. Middleware (`src/middleware.ts`)

Automatically protects routes:
- `/dashboard` - Requires authentication
- `/editor` - Requires authentication
- `/` - Public
- `/api/auth/*` - Public (auth routes)
- `/api/waitlist` - Public

#### 4. React Components

**AuthProvider** (`src/components/auth/AuthProvider.tsx`)
- Provides authentication context to the entire app
- Manages authentication state
- Already integrated in `src/app/layout.tsx`

**LoginModal** (`src/components/auth/LoginModal.tsx`)
- User-friendly login interface
- Email input with validation
- Error handling
- Auto-login for MVP

### Usage Example

```tsx
"use client";

import { useAuth } from "@/components/auth";
import { LoginModal } from "@/components/auth";
import { useState } from "react";

export function MyPage() {
  const { user, isLoading, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  if (isLoading) return <div>Loading...</div>;

  if (!user) {
    return (
      <>
        <button onClick={() => setShowLogin(true)}>Login</button>
        <LoginModal
          isOpen={showLogin}
          onClose={() => setShowLogin(false)}
          onSuccess={() => console.log("Logged in!")}
        />
      </>
    );
  }

  return (
    <div>
      <p>Welcome, {user.email}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

## Re-recording Modal

### Overview

The `RerecordModal` component provides a complete audio recording interface for re-recording podcast segments that have AI-detected issues.

### Features

- **Real-time audio recording** - Uses MediaRecorder API
- **Live waveform visualization** - Web Audio API with canvas rendering
- **Recording timer** - Shows duration in MM:SS format
- **Playback controls** - Play, pause, and retry functionality
- **Issue detection display** - Shows AI-detected problems and suggestions
- **Audio upload** - Saves recordings to storage and updates segments

### Supported Error Types

1. **Factual Error** - Incorrect information that needs correction
2. **Contradiction** - Statements that conflict with each other
3. **Confusing** - Unclear or hard-to-understand content
4. **Incomplete** - Thoughts or ideas that weren't finished

### Component API

```tsx
interface RerecordModalProps {
  isOpen: boolean;
  segment: Segment | null;
  onClose: () => void;
  onConfirm: (segmentId: string, audioBlob: Blob) => Promise<void>;
}
```

### Usage Example

```tsx
"use client";

import { useState } from "react";
import { RerecordModal } from "@/components/editor";
import type { Segment } from "@/lib/db/schema";

export function EditorPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);

  const handleRerecord = async (segmentId: string, audioBlob: Blob) => {
    // Upload to storage
    const formData = new FormData();
    formData.append("audio", audioBlob, "rerecorded-audio.webm");
    formData.append("segmentId", segmentId);

    const response = await fetch("/api/segments/rerecord", {
      method: "POST",
      body: formData,
    });

    const { audioUrl } = await response.json();

    // Update segment
    await fetch(`/api/segments/${segmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rerecordedAudioUrl: audioUrl,
        hasError: false,
      }),
    });
  };

  return (
    <>
      {/* Your editor UI */}
      <RerecordModal
        isOpen={showModal}
        segment={selectedSegment}
        onClose={() => setShowModal(false)}
        onConfirm={handleRerecord}
      />
    </>
  );
}
```

### Recording Flow

1. User clicks "Start Recording"
2. Browser requests microphone permission
3. Recording starts with waveform visualization
4. Timer shows recording duration
5. User clicks "Stop Recording"
6. Preview with play/pause controls
7. "Record Again" to retry or "Confirm & Replace" to save

### Browser Requirements

- MediaRecorder API
- Web Audio API
- getUserMedia (microphone access)

Supported in all modern browsers: Chrome, Firefox, Safari, Edge.

---

## File Structure

```
src/
├── lib/
│   └── auth/
│       └── session.ts              # Session management utilities
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── login/
│   │       │   └── route.ts        # Login API endpoint
│   │       ├── logout/
│   │       │   └── route.ts        # Logout API endpoint
│   │       └── me/
│   │           └── route.ts        # Get current user endpoint
│   └── layout.tsx                  # Root layout with AuthProvider
├── components/
│   ├── auth/
│   │   ├── AuthProvider.tsx        # Authentication context
│   │   ├── LoginModal.tsx          # Login UI component
│   │   ├── index.ts                # Barrel exports
│   │   └── USAGE.md                # Auth documentation
│   └── editor/
│       ├── RerecordModal.tsx       # Re-recording component
│       ├── index.ts                # Barrel exports
│       └── USAGE.md                # Editor documentation
└── middleware.ts                   # Route protection
```

---

## Quick Start

### 1. Run Database Migrations

Make sure your database has the required tables:

```bash
npm run db:push
```

### 2. Test Authentication

Start the development server:

```bash
npm run dev
```

Navigate to any protected route (e.g., `/dashboard`) and you should be redirected to `/`.

### 3. Use LoginModal

Add the LoginModal to your landing page or navigation:

```tsx
import { LoginModal } from "@/components/auth";

// In your component
<LoginModal
  isOpen={showLogin}
  onClose={() => setShowLogin(false)}
  onSuccess={() => router.push("/dashboard")}
/>
```

### 4. Access User Data

In any client component:

```tsx
import { useAuth } from "@/components/auth";

const { user, isLoading, logout } = useAuth();
```

### 5. Implement Re-recording

```tsx
import { RerecordModal } from "@/components/editor";

<RerecordModal
  isOpen={showRerecordModal}
  segment={selectedSegment}
  onClose={() => setShowRerecordModal(false)}
  onConfirm={handleConfirmRerecord}
/>
```

---

## API Reference

### Authentication APIs

#### POST /api/auth/login

Login a user (MVP auto-login).

**Request:**
```json
{
  "email": "user@example.com",
  "name": "Optional Name"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "plan": "free"
  }
}
```

#### POST /api/auth/logout

Logout the current user.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET /api/auth/me

Get current user information.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "plan": "free"
  }
}
```

### Re-recording API (To Be Implemented)

#### POST /api/segments/rerecord

Upload a re-recorded audio segment.

**Request:**
- Content-Type: multipart/form-data
- Fields:
  - `audio`: Audio file (webm format)
  - `segmentId`: UUID of segment

**Response:**
```json
{
  "audioUrl": "https://storage.example.com/path/to/audio.webm"
}
```

#### PATCH /api/segments/:id

Update segment with re-recorded audio URL.

**Request:**
```json
{
  "rerecordedAudioUrl": "https://...",
  "hasError": false,
  "errorType": null,
  "errorDetail": null
}
```

**Response:**
```json
{
  "success": true,
  "segment": { /* updated segment */ }
}
```

---

## Security Considerations

### Current (MVP)

- HTTP-only cookies prevent XSS attacks
- Secure flag in production (HTTPS only)
- SameSite cookie protection
- Session expiration (30 days)
- Middleware-based route protection

### Production Recommendations

1. **Magic Links** - Replace auto-login with email verification
2. **CSRF Protection** - Add CSRF tokens to forms
3. **Rate Limiting** - Prevent brute force attacks
4. **Email Verification** - Verify email ownership
5. **2FA** - Add two-factor authentication (optional)
6. **Session Refresh** - Implement refresh tokens

---

## Upgrading to Production

To upgrade from MVP auto-login to production magic links:

1. **Generate Magic Link Token**
```typescript
// In /api/auth/login
const token = generateSecureToken();
await saveToken(email, token, expiresAt);
const magicLink = `${baseUrl}/auth/verify?token=${token}`;
await sendEmail(email, magicLink);
```

2. **Create Verification Endpoint**
```typescript
// /api/auth/verify
const { token } = await request.json();
const email = await verifyToken(token);
if (email) {
  const user = await getOrCreateUser(email);
  await setSession({ userId: user.id, email: user.email });
}
```

3. **Send Email**
Use a service like SendGrid, Postmark, or Resend to send magic link emails.

---

## Troubleshooting

### Authentication not working?

1. Check browser cookies are enabled
2. Verify database connection
3. Check middleware configuration
4. Ensure session cookie is being set

### Re-recording not working?

1. Check microphone permissions
2. Verify browser supports MediaRecorder API
3. Check Web Audio API compatibility
4. Ensure storage upload endpoint exists

### Session expires too quickly?

Adjust `SESSION_DURATION` in `src/lib/auth/session.ts`:

```typescript
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
```

---

## Support

For detailed usage instructions, see:
- `src/components/auth/USAGE.md` - Authentication system
- `src/components/editor/USAGE.md` - Re-recording modal

For questions or issues, please refer to the project documentation or create an issue in the repository.
