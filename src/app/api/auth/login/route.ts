import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser, setSession } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const { email, name } = result.data;

    // For MVP: Auto-login without sending email
    // In production, this would send a magic link email
    const user = await getOrCreateUser(email, name);

    // Create session
    await setSession({
      userId: user.id,
      email: user.email,
      name: user.name || undefined,
      plan: user.plan || undefined,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Failed to login" },
      { status: 500 }
    );
  }
}
