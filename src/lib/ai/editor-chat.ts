/**
 * Servico de Chat para Edicao de Podcast
 *
 * Usa Anthropic Claude para processar comandos de edicao em linguagem natural
 */

import { getSemanticSearchService, SegmentWithEmbedding } from "./semantic-search";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CHAT_MODEL = "claude-sonnet-4-20250514";

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
    this.apiKey = options?.apiKey || ANTHROPIC_API_KEY || "";
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

IMPORTANTE: Quando o usuario perguntar sobre partes do podcast (ex: "qual parte fala de IA?", "onde menciona X?"), voce DEVE:
1. Analisar os segmentos acima e os resultados da busca semantica
2. Identificar os segmentos relevantes
3. Retornar uma acao "focus" com os IDs dos segmentos para que sejam destacados na timeline

Quando o usuario perguntar "como posso melhorar?" ou pedir sugestoes:
1. Analise as estatisticas acima
2. Identifique oportunidades de melhoria (ex: segmentos de baixo interesse selecionados, segmentos de alto interesse nao selecionados)
3. Sugira acoes concretas com os IDs dos segmentos

Quando sugerir acoes, retorne um JSON no formato:
\`\`\`json
{
  "actions": [
    {"type": "select|deselect|focus|info", "segmentIds": ["id1", "id2"], "message": "descricao da acao"}
  ]
}
\`\`\`

Tipos de acao:
- select: selecionar segmentos para incluir na edicao
- deselect: remover segmentos da edicao
- focus: destacar segmentos para o usuario ver/ouvir (USE ISSO quando o usuario perguntar sobre partes especificas!)
- info: apenas informar algo, sem acao de edicao

Se nao houver acoes de edicao, apenas responda normalmente sem o bloco JSON.`;

    // Construir historico de conversa
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: userMessage },
    ];

    // Chamar API Anthropic
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1000,
        system: messages[0].content,
        messages: messages.slice(1).map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Chat API error: ${error}`);
    }

    const data = await response.json();
    const assistantMessage = data.content?.[0]?.text || "";

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
