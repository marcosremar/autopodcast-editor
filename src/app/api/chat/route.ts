import { NextRequest, NextResponse } from "next/server";
import { db, segments } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getEditorChatService } from "@/lib/ai/editor-chat";

/**
 * POST /api/chat
 * Chat para edicao do podcast com IA
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, message, history = [] } = await request.json();

    if (!projectId || !message) {
      return NextResponse.json(
        { error: "projectId and message are required" },
        { status: 400 }
      );
    }

    // Buscar segmentos do projeto
    const projectSegments = await db
      .select()
      .from(segments)
      .where(eq(segments.projectId, projectId))
      .orderBy(segments.startTime);

    if (projectSegments.length === 0) {
      return NextResponse.json({
        response: "Este projeto ainda nao tem segmentos processados.",
        actions: [],
      });
    }

    // Processar mensagem com o servico de chat
    const chatService = getEditorChatService();
    const result = await chatService.processMessage(
      message,
      projectSegments.map(s => ({
        id: s.id,
        text: s.text,
        topic: s.topic,
        startTime: s.startTime,
        endTime: s.endTime,
        isSelected: s.isSelected || false,
        interestScore: s.interestScore,
      })),
      history
    );

    return NextResponse.json({
      response: result.response,
      actions: result.actions,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Chat processing failed", details: String(error) },
      { status: 500 }
    );
  }
}
