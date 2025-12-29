# Authentication Components Usage

## Overview

The authentication system provides simple session-based authentication with the following components:

- `AuthProvider` - Context provider for authentication state
- `LoginModal` - UI component for user login
- Session management utilities

## Quick Start

### 1. Setup (Already Done)

The `AuthProvider` is already wrapped around your app in `src/app/layout.tsx`:

```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

### 2. Using Authentication in Components

```tsx
"use client";

import { useAuth } from "@/components/auth";
import { LoginModal } from "@/components/auth";
import { useState } from "react";

export function MyComponent() {
  const { user, isLoading, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <>
        <button onClick={() => setShowLoginModal(true)}>
          Login
        </button>

        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            console.log("Login successful!");
            // Optionally redirect or refresh
          }}
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

### 3. Protected Routes

Routes like `/dashboard` and `/editor` are automatically protected by the middleware.

If a user tries to access these routes without being authenticated, they'll be redirected to the home page (`/`).

### 4. Server-Side Authentication

In API routes or Server Components, you can check authentication:

```tsx
import { getSession } from "@/lib/auth/session";

export async function MyServerComponent() {
  const session = await getSession();

  if (!session) {
    return <div>Please log in</div>;
  }

  return <div>Welcome, {session.email}!</div>;
}
```

## API Endpoints

### POST /api/auth/login

Login a user (creates session).

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

### POST /api/auth/logout

Logout the current user (clears session).

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /api/auth/me

Get the current user's information.

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

## Session Management

Sessions are stored in HTTP-only cookies and last for 30 days.

The session cookie is named `autopodcast_session` and contains:
- `userId` - User's UUID
- `email` - User's email
- `name` - User's name (optional)
- `plan` - User's plan (optional)
- `expiresAt` - Unix timestamp for expiration

## MVP Note

For the MVP, the system uses auto-login (no email verification). In production, you would:

1. Generate a magic link token
2. Send it via email
3. Verify the token when the user clicks the link
4. Create the session only after verification

## Security Features

- HTTP-only cookies (not accessible via JavaScript)
- Secure flag in production (HTTPS only)
- SameSite protection
- Session expiration
- Protected routes via middleware
