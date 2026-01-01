import { NextRequest, NextResponse } from "next/server";
import { aiCompleteJSON } from "@/lib/ai/AIService";

interface SummarizeRequest {
  text: string;
  maxWords?: number;
}

interface SummaryResponse {
  summary: string;
}

/**
 * POST /api/ai/summarize
 * Generate a summary of the given text using AI
 */
export async function POST(request: NextRequest) {
  try {
    const body: SummarizeRequest = await request.json();
    const { text, maxWords = 200 } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Truncate very long texts to avoid token limits
    const truncatedText = text.length > 10000 ? text.substring(0, 10000) + "..." : text;

    const prompt = `Voce e um assistente de edicao de podcast. Gere um resumo conciso (maximo ${maxWords} palavras) do seguinte conteudo transcrito. O resumo deve:
- Capturar os pontos principais discutidos
- Ser escrito em portugues
- Ser claro e informativo
- Destacar os insights mais importantes

TEXTO:
"""
${truncatedText}
"""

Retorne APENAS um JSON valido:
{
  "summary": "resumo aqui"
}`;

    try {
      const result = await aiCompleteJSON<SummaryResponse>("section_summary", prompt);
      return NextResponse.json({ summary: result.summary });
    } catch (aiError) {
      console.error("AI summarization failed:", aiError);

      // Fallback: Generate a simple extractive summary
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
      const firstSentences = sentences.slice(0, 3).join(". ").trim();
      const fallbackSummary = firstSentences.length > 0
        ? firstSentences + "."
        : `Secao de audio com ${text.split(" ").length} palavras.`;

      return NextResponse.json({ summary: fallbackSummary });
    }
  } catch (error) {
    console.error("Summarize error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
