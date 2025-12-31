import { NextRequest, NextResponse } from "next/server";
import { db, chatMessages } from "@/lib/db";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/chat/[projectId]
 * Buscar histórico de mensagens do chat para um projeto
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    // Validar formato UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
      return NextResponse.json(
        { error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    // Buscar mensagens não deletadas (últimas 100)
    const messages = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.projectId, projectId),
          eq(chatMessages.isDeleted, false)
        )
      )
      .orderBy(chatMessages.createdAt)
      .limit(100);

    // Mapear para formato do frontend
    return NextResponse.json({
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        actions: m.actions,
        timestamp: m.createdAt,
      })),
    });
  } catch (error) {
    console.error("Failed to load chat history:", error);
    return NextResponse.json(
      { error: "Failed to load chat history" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chat/[projectId]
 * Limpar histórico de mensagens do chat (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    // Validar formato UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
      return NextResponse.json(
        { error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    // Soft delete: marcar mensagens como deletadas
    await db
      .update(chatMessages)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(eq(chatMessages.projectId, projectId));

    return NextResponse.json({
      message: "Chat history cleared successfully",
    });
  } catch (error) {
    console.error("Failed to clear chat history:", error);
    return NextResponse.json(
      { error: "Failed to clear chat history" },
      { status: 500 }
    );
  }
}
