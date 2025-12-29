import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Email validation schema
const waitlistSchema = z.object({
  email: z.string().email("Email invalido"),
});

// In-memory storage for development (before DB is set up)
// Will be replaced with real database
const waitlistEmails: Set<string> = new Set();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = waitlistSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Email invalido" },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if DATABASE_URL is configured
    if (process.env.DATABASE_URL) {
      // Use real database
      try {
        const { db, waitlist } = await import("@/lib/db");
        const { eq } = await import("drizzle-orm");

        // Check if email already exists
        const existing = await db
          .select()
          .from(waitlist)
          .where(eq(waitlist.email, normalizedEmail))
          .limit(1);

        if (existing.length > 0) {
          return NextResponse.json(
            { error: "Este email ja esta na lista de espera" },
            { status: 409 }
          );
        }

        // Insert new email
        await db.insert(waitlist).values({
          email: normalizedEmail,
        });

        return NextResponse.json(
          { success: true, message: "Email cadastrado com sucesso!" },
          { status: 201 }
        );
      } catch (dbError) {
        console.error("Database error:", dbError);
        // Fall through to in-memory storage
      }
    }

    // Fallback to in-memory storage (for development without DB)
    if (waitlistEmails.has(normalizedEmail)) {
      return NextResponse.json(
        { error: "Este email ja esta na lista de espera" },
        { status: 409 }
      );
    }

    waitlistEmails.add(normalizedEmail);
    console.log(`[Waitlist] New signup: ${normalizedEmail}`);
    console.log(`[Waitlist] Total signups: ${waitlistEmails.size}`);

    return NextResponse.json(
      { success: true, message: "Email cadastrado com sucesso!" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Admin endpoint to see waitlist count (for development)
  // In production, this should be protected
  return NextResponse.json({
    count: waitlistEmails.size,
    emails: process.env.NODE_ENV === "development" ? Array.from(waitlistEmails) : undefined,
  });
}
