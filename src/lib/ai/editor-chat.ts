/**
 * Servico de Chat para Edicao de Podcast
 *
 * Usa OpenRouter para processar comandos de edicao em linguagem natural
 */

import { getSemanticSearchService, SegmentWithEmbedding } from "./semantic-search";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";
const CHAT_MODEL = "qwen/qwen-2.5-72b-instruct";

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
  private apiKey: string;
  private model: string;
  private searchService = getSemanticSearchService();

  constructor(options?: { apiKey?: string; model?: string }) {
    this.apiKey = options?.apiKey || OPENROUTER_API_KEY;
    this.model = options?.model || CHAT_MODEL;
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

    // Busca semantica se a mensagem parece uma busca
    let searchResults: { id: string; text: string; score: number }[] = [];
    const searchKeywords = ["sobre", "fala de", "menciona", "parte que", "trecho", "onde", "quando"];
    const isSearchQuery = searchKeywords.some(kw => userMessage.toLowerCase().includes(kw));

    if (isSearchQuery) {
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
    }

    // Construir prompt do sistema
    const systemPrompt = `Voce e um assistente de edicao de podcast. O usuario pode te pedir para:
- Selecionar/deselecionar segmentos especificos
- Focar em determinados topicos (selecionar mais segmentos relacionados)
- Remover partes sobre determinado assunto
- Adicionar transicoes entre secoes
- Reorganizar a ordem dos segmentos
- Responder perguntas sobre o conteudo

SEGMENTOS SELECIONADOS (${selectedSegments.length}):
${selectedSegments.map((s, i) => `[${i}] ID:${s.id} | ${s.startTime.toFixed(1)}s | ${s.topic || "Sem topico"} | "${s.text.substring(0, 100)}..."`).join("\n")}

SEGMENTOS NAO SELECIONADOS (${unselectedSegments.length}):
${unselectedSegments.slice(0, 20).map((s, i) => `[${i}] ID:${s.id} | ${s.startTime.toFixed(1)}s | ${s.topic || "Sem topico"} | "${s.text.substring(0, 100)}..."`).join("\n")}
${unselectedSegments.length > 20 ? `\n... e mais ${unselectedSegments.length - 20} segmentos` : ""}

${searchResults.length > 0 ? `
RESULTADOS DA BUSCA SEMANTICA para "${userMessage}":
${searchResults.map((r, i) => `[${i}] ID:${r.id} | Score:${r.score.toFixed(2)} | "${r.text.substring(0, 150)}..."`).join("\n")}
` : ""}

Responda em portugues de forma natural e amigavel.
Quando sugerir acoes, retorne um JSON no formato:
\`\`\`json
{
  "actions": [
    {"type": "select|deselect|focus|remove_topic|info", "segmentIds": ["id1", "id2"], "message": "descricao da acao"}
  ]
}
\`\`\`

Tipos de acao:
- select: selecionar segmentos para incluir na edicao
- deselect: remover segmentos da edicao
- focus: destacar segmentos para o usuario ver
- remove_topic: remover todos segmentos sobre um topico
- info: apenas informar algo, sem acao

Se nao houver acoes, apenas responda normalmente sem o bloco JSON.`;

    // Construir historico de conversa
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: userMessage },
    ];

    // Chamar API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        "HTTP-Referer": "https://autopodcast.app",
        "X-Title": "AutoPodcast Editor",
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Chat API error: ${error}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || "";

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
