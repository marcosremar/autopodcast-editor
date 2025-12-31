/**
 * Servico de Chat para Edicao de Podcast
 * Usa AIService centralizado (Groq) para processar comandos de edicao em linguagem natural
 */

import { getAIService, type AIMessage } from "@/lib/ai/AIService";
import { getSemanticSearchService, SegmentWithEmbedding } from "./semantic-search";

export interface Segment {
  id: string;
  text: string;
  topic?: string | null;
  startTime: number;
  endTime: number;
  isSelected: boolean;
  interestScore?: number | null;
}

export interface EditAction {
  type: "select" | "deselect" | "reorder" | "focus" | "remove_topic" | "add_transition" | "info";
  segmentIds?: string[];
  message: string;
  details?: Record<string, unknown>;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: EditAction[];
  timestamp: Date;
}

export class EditorChatService {
  private searchService = getSemanticSearchService();

  constructor() {
    // AIService é inicializado automaticamente via singleton
  }

  /**
   * Processa uma mensagem do usuario e retorna acoes de edicao
   */
  async processMessage(
    userMessage: string,
    segments: Segment[],
    conversationHistory: ChatMessage[] = []
  ): Promise<{ response: string; actions: EditAction[] }> {
    // Preparar contexto dos segmentos
    const selectedSegments = segments.filter(s => s.isSelected);
    const unselectedSegments = segments.filter(s => !s.isSelected);

    // Calcular estatisticas do podcast
    const totalDuration = segments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
    const editedDuration = selectedSegments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
    const reduction = totalDuration > 0 ? Math.round((1 - editedDuration / totalDuration) * 100) : 0;
    const avgScore = segments.length > 0
      ? (segments.reduce((sum, s) => sum + (s.interestScore || 0), 0) / segments.length).toFixed(1)
      : "0";
    const lowScoreSegments = segments.filter(s => (s.interestScore || 0) < 5);
    const highScoreSegments = segments.filter(s => (s.interestScore || 0) >= 7);
    const topics = [...new Set(segments.map(s => s.topic).filter(Boolean))];

    // Busca semantica se a mensagem parece uma busca
    let searchResults: { id: string; text: string; score: number }[] = [];
    const searchKeywords = ["sobre", "fala de", "menciona", "parte que", "trecho", "onde", "quando", "foca", "focando", "IA", "inteligência"];
    const isSearchQuery = searchKeywords.some(kw => userMessage.toLowerCase().includes(kw.toLowerCase()));

    if (isSearchQuery) {
      try {
        const searchSegments: SegmentWithEmbedding[] = segments.map(s => ({
          id: s.id,
          text: s.text,
          topic: s.topic || undefined,
          startTime: s.startTime,
          endTime: s.endTime,
        }));

        searchResults = await this.searchService.search(userMessage, searchSegments, {
          topK: 5,
          minScore: 0.4,
        });
      } catch (searchError) {
        console.error("Search error (continuing without search results):", searchError);
        // Continua sem resultados de busca
      }
    }

    // Formatar duracao em minutos:segundos
    const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Construir prompt do sistema
    const systemPrompt = `Voce e um assistente de edicao de podcast. O usuario pode te pedir para:
- Selecionar/deselecionar segmentos especificos
- Focar em determinados topicos (selecionar mais segmentos relacionados)
- Remover partes sobre determinado assunto
- Dar sugestoes de como melhorar a edicao
- Analisar a qualidade atual da edicao
- Responder perguntas sobre o conteudo

=== ESTATISTICAS DO PODCAST ===
- Duracao original: ${formatDuration(totalDuration)}
- Duracao editada: ${formatDuration(editedDuration)} (reducao de ${reduction}%)
- Total de segmentos: ${segments.length}
- Segmentos selecionados: ${selectedSegments.length}
- Score medio de interesse: ${avgScore}/10
- Segmentos de baixo interesse (score < 5): ${lowScoreSegments.length}
- Segmentos de alto interesse (score >= 7): ${highScoreSegments.length}
- Topicos encontrados: ${topics.length > 0 ? topics.slice(0, 5).join(", ") : "Nenhum topico identificado"}

=== SEGMENTOS SELECIONADOS (${selectedSegments.length}) ===
${selectedSegments.slice(0, 15).map((s, i) => `[${i}] ID:${s.id} | ${s.startTime.toFixed(1)}s | Score:${s.interestScore || 0} | ${s.topic || "Sem topico"} | "${s.text.substring(0, 80)}..."`).join("\n")}
${selectedSegments.length > 15 ? `\n... e mais ${selectedSegments.length - 15} segmentos selecionados` : ""}

=== SEGMENTOS NAO SELECIONADOS (${unselectedSegments.length}) ===
${unselectedSegments.slice(0, 15).map((s, i) => `[${i}] ID:${s.id} | ${s.startTime.toFixed(1)}s | Score:${s.interestScore || 0} | ${s.topic || "Sem topico"} | "${s.text.substring(0, 80)}..."`).join("\n")}
${unselectedSegments.length > 15 ? `\n... e mais ${unselectedSegments.length - 15} segmentos nao selecionados` : ""}

${searchResults.length > 0 ? `
=== RESULTADOS DA BUSCA SEMANTICA ===
Query: "${userMessage}"
${searchResults.map((r, i) => `[${i}] ID:${r.id} | Score:${r.score.toFixed(2)} | "${r.text.substring(0, 150)}..."`).join("\n")}
` : ""}

=== INSTRUCOES ===
Responda em portugues de forma natural e amigavel.

⚠️  REGRA CRITICA - SEMPRE RETORNE JSON QUANDO HOUVER ACOES! ⚠️

Quando o usuario perguntar sobre partes do podcast, voce DEVE obrigatoriamente:
1. Analisar os segmentos e resultados da busca semantica
2. Identificar os IDs dos segmentos relevantes
3. Retornar um bloco JSON com acao "focus"

EXEMPLOS DE QUANDO RETORNAR JSON:
- "me mostra a introducao" → focus nos segmentos da introducao
- "qual parte fala de IA?" → focus nos segmentos que mencionam IA
- "onde menciona X?" → focus nos segmentos sobre X

FORMATO OBRIGATORIO:
Primeiro escreva uma resposta amigavel explicando o que encontrou.
Depois, SEMPRE inclua o bloco JSON ao final:

\`\`\`json
{
  "actions": [
    {"type": "focus", "segmentIds": ["id-real-1", "id-real-2"], "message": "Destacando os segmentos sobre [topico]"}
  ]
}
\`\`\`

IMPORTANTE:
- Use IDs REAIS dos segmentos listados acima (ex: "550e8400-e29b-41d4-a716-446655440000")
- NUNCA invente IDs
- Type "focus" = destacar na timeline (use para buscas/perguntas)
- Type "select" = adicionar a edicao final
- Type "deselect" = remover da edicao final
- Type "info" = apenas informar, sem acao

Se nao houver acoes, apenas responda normalmente sem JSON.`;

    // Construir mensagens para AIService
    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: userMessage },
    ];

    // Usar AIService centralizado
    const ai = getAIService();
    const result = await ai.complete({
      task: "editor_chat",
      messages,
    });

    const assistantMessage = result.content;

    // Extrair acoes do JSON se houver
    const actions: EditAction[] = [];
    const jsonMatch = assistantMessage.match(/```json\n?([\s\S]*?)\n?```/);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.actions && Array.isArray(parsed.actions)) {
          for (const action of parsed.actions) {
            actions.push({
              type: action.type || "info",
              segmentIds: action.segmentIds || [],
              message: action.message || "",
              details: action.details,
            });
          }
        }
      } catch (e) {
        console.error("Failed to parse actions JSON:", e);
      }
    }

    // Limpar a resposta removendo o JSON
    const cleanResponse = assistantMessage
      .replace(/```json\n?[\s\S]*?\n?```/g, "")
      .trim();

    return {
      response: cleanResponse || "Entendido! Processando sua solicitacao...",
      actions,
    };
  }

  /**
   * Gera sugestoes de edicao baseadas no conteudo
   */
  async generateSuggestions(segments: Segment[]): Promise<string[]> {
    const topics = [...new Set(segments.map(s => s.topic).filter(Boolean))];
    const lowScoreSegments = segments.filter(s => (s.interestScore || 0) < 5);
    const selectedCount = segments.filter(s => s.isSelected).length;

    const suggestions: string[] = [];

    if (lowScoreSegments.length > 5) {
      suggestions.push(`Remover ${lowScoreSegments.length} segmentos de baixo interesse`);
    }

    if (topics.length > 3) {
      suggestions.push(`Focar em um topico especifico (${topics.slice(0, 3).join(", ")}...)`);
    }

    if (selectedCount < segments.length * 0.3) {
      suggestions.push("Adicionar mais segmentos para enriquecer o conteudo");
    }

    if (selectedCount > segments.length * 0.8) {
      suggestions.push("Reduzir para um formato mais conciso");
    }

    return suggestions;
  }
}

// Singleton
let instance: EditorChatService | null = null;

export function getEditorChatService(): EditorChatService {
  if (!instance) {
    instance = new EditorChatService();
  }
  return instance;
}
