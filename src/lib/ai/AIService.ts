/**
 * AIService - Módulo Central de IA do AeroPod
 *
 * Gerencia todas as chamadas de IA do sistema.
 * Providers suportados: Groq, OpenRouter
 * NÃO usa Anthropic (muito caro)
 */

import Groq from "groq-sdk";

// ========================================
// TIPOS
// ========================================

export type AIProvider = "groq" | "openrouter";

export type TaskType =
  | "segment_mapping" // Organizar segmentos em seções
  | "content_detection" // Detectar tipo de conteúdo
  | "gap_analysis" // Identificar gaps
  | "segment_classification" // Classificar segmentos
  | "transcription_summary" // Resumir transcrição
  | "editor_chat" // Chat do editor
  | "editing_suggestions" // Sugestões de edição
  | "script_generation" // Gerar scripts
  | "segment_analysis" // Analisar segmentos individuais
  | "show_notes" // Gerar show notes
  | "segment_reorder"; // Reordenar segmentos

export type TaskComplexity = "fast" | "balanced" | "powerful";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AICompletionOptions {
  task: TaskType;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

export interface AICompletionResult {
  content: string;
  model: string;
  provider: AIProvider;
  tokensUsed?: number;
  latencyMs: number;
}

// ========================================
// CONFIGURAÇÃO DE MODELOS
// ========================================

// Modelos disponíveis no Groq (mais rápido e barato)
export const GROQ_MODELS = {
  // Ultra rápidos (1000+ tok/s)
  GPT_OSS_20B: "openai/gpt-oss-20b",
  LLAMA_8B: "llama-3.1-8b-instant",

  // Rápidos (500-750 tok/s)
  GPT_OSS_120B: "openai/gpt-oss-120b",
  LLAMA_4_SCOUT: "meta-llama/llama-4-scout-17b-16e-instruct",

  // Potentes (200-300 tok/s)
  LLAMA_70B: "llama-3.3-70b-versatile",
} as const;

// Modelos disponíveis no OpenRouter (fallback)
export const OPENROUTER_MODELS = {
  LLAMA_8B: "meta-llama/llama-3.1-8b-instruct",
  LLAMA_70B: "meta-llama/llama-3.3-70b-instruct",
  QWEN_32B: "qwen/qwen-2.5-32b-instruct",
} as const;

// Configuração por tipo de tarefa
const TASK_CONFIG: Record<
  TaskType,
  {
    complexity: TaskComplexity;
    model: string;
    fallbackModel: string;
    maxTokens: number;
    temperature: number;
    description: string;
  }
> = {
  // Tarefas rápidas - usar modelo mais leve
  segment_mapping: {
    complexity: "fast",
    model: GROQ_MODELS.GPT_OSS_20B,
    fallbackModel: OPENROUTER_MODELS.LLAMA_8B,
    maxTokens: 2048,
    temperature: 0.3,
    description: "Organizar segmentos em seções do template",
  },
  content_detection: {
    complexity: "fast",
    model: GROQ_MODELS.GPT_OSS_20B,
    fallbackModel: OPENROUTER_MODELS.LLAMA_8B,
    maxTokens: 1024,
    temperature: 0.2,
    description: "Detectar tipo de conteúdo do podcast",
  },
  gap_analysis: {
    complexity: "fast",
    model: GROQ_MODELS.GPT_OSS_20B,
    fallbackModel: OPENROUTER_MODELS.LLAMA_8B,
    maxTokens: 1024,
    temperature: 0.3,
    description: "Identificar seções que precisam de conteúdo",
  },
  segment_classification: {
    complexity: "fast",
    model: GROQ_MODELS.GPT_OSS_20B,
    fallbackModel: OPENROUTER_MODELS.LLAMA_8B,
    maxTokens: 512,
    temperature: 0.2,
    description: "Classificar tipo de cada segmento",
  },
  transcription_summary: {
    complexity: "fast",
    model: GROQ_MODELS.GPT_OSS_20B,
    fallbackModel: OPENROUTER_MODELS.LLAMA_8B,
    maxTokens: 1024,
    temperature: 0.4,
    description: "Resumir transcrição do episódio",
  },

  // Tarefas balanceadas - usar modelo médio
  editor_chat: {
    complexity: "balanced",
    model: GROQ_MODELS.GPT_OSS_120B,
    fallbackModel: OPENROUTER_MODELS.QWEN_32B,
    maxTokens: 2048,
    temperature: 0.7,
    description: "Chat interativo do editor",
  },
  editing_suggestions: {
    complexity: "balanced",
    model: GROQ_MODELS.GPT_OSS_120B,
    fallbackModel: OPENROUTER_MODELS.QWEN_32B,
    maxTokens: 2048,
    temperature: 0.5,
    description: "Sugestões de edição de áudio",
  },

  // Tarefas potentes - usar modelo mais capaz
  script_generation: {
    complexity: "powerful",
    model: GROQ_MODELS.LLAMA_70B,
    fallbackModel: OPENROUTER_MODELS.LLAMA_70B,
    maxTokens: 4096,
    temperature: 0.7,
    description: "Gerar scripts para seções faltantes",
  },

  // Novas tarefas integradas
  segment_analysis: {
    complexity: "balanced",
    model: GROQ_MODELS.GPT_OSS_120B,
    fallbackModel: OPENROUTER_MODELS.QWEN_32B,
    maxTokens: 2048,
    temperature: 0.1,
    description: "Analisar qualidade e conteúdo de segmentos",
  },
  show_notes: {
    complexity: "balanced",
    model: GROQ_MODELS.GPT_OSS_120B,
    fallbackModel: OPENROUTER_MODELS.QWEN_32B,
    maxTokens: 4096,
    temperature: 0.5,
    description: "Gerar show notes, resumos e capítulos",
  },
  segment_reorder: {
    complexity: "balanced",
    model: GROQ_MODELS.GPT_OSS_120B,
    fallbackModel: OPENROUTER_MODELS.QWEN_32B,
    maxTokens: 4096,
    temperature: 0.3,
    description: "Sugerir reordenação de segmentos",
  },
};

// ========================================
// CLASSE PRINCIPAL
// ========================================

export class AIService {
  private groqClient: Groq | null = null;
  private openrouterApiKey: string | null = null;
  private preferredProvider: AIProvider = "groq";

  constructor() {
    // Inicializar Groq se API key disponível
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      this.groqClient = new Groq({ apiKey: groqKey });
    }

    // Guardar OpenRouter key para fallback
    this.openrouterApiKey = process.env.OPENROUTER_API_KEY || null;

    // Verificar se pelo menos um provider está configurado
    if (!this.groqClient && !this.openrouterApiKey) {
      console.warn(
        "[AIService] Nenhum provider de IA configurado! Configure GROQ_API_KEY ou OPENROUTER_API_KEY"
      );
    }
  }

  /**
   * Executar completion de IA
   */
  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    const startTime = Date.now();
    const config = TASK_CONFIG[options.task];

    // Log da tarefa
    console.log(
      `[AIService] Task: ${options.task} | Model: ${config.model} | Complexity: ${config.complexity}`
    );

    // Tentar Groq primeiro (mais rápido)
    if (this.groqClient) {
      try {
        const result = await this.completeWithGroq(options, config);
        return {
          ...result,
          latencyMs: Date.now() - startTime,
        };
      } catch (error) {
        console.warn(`[AIService] Groq falhou, tentando fallback:`, error);
      }
    }

    // Fallback para OpenRouter
    if (this.openrouterApiKey) {
      try {
        const result = await this.completeWithOpenRouter(options, config);
        return {
          ...result,
          latencyMs: Date.now() - startTime,
        };
      } catch (error) {
        console.error(`[AIService] OpenRouter também falhou:`, error);
        throw error;
      }
    }

    throw new Error(
      "Nenhum provider de IA disponível. Configure GROQ_API_KEY ou OPENROUTER_API_KEY"
    );
  }

  /**
   * Completion via Groq
   */
  private async completeWithGroq(
    options: AICompletionOptions,
    config: (typeof TASK_CONFIG)[TaskType]
  ): Promise<Omit<AICompletionResult, "latencyMs">> {
    if (!this.groqClient) {
      throw new Error("Groq client não inicializado");
    }

    const completion = await this.groqClient.chat.completions.create({
      messages: options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      model: config.model,
      temperature: options.temperature ?? config.temperature,
      max_tokens: options.maxTokens ?? config.maxTokens,
      response_format: options.jsonMode ? { type: "json_object" } : undefined,
    });

    const content = completion.choices[0]?.message?.content || "";

    return {
      content,
      model: config.model,
      provider: "groq",
      tokensUsed: completion.usage?.total_tokens,
    };
  }

  /**
   * Completion via OpenRouter
   */
  private async completeWithOpenRouter(
    options: AICompletionOptions,
    config: (typeof TASK_CONFIG)[TaskType]
  ): Promise<Omit<AICompletionResult, "latencyMs">> {
    if (!this.openrouterApiKey) {
      throw new Error("OpenRouter API key não configurada");
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.openrouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost",
          "X-Title": "AeroPod",
        },
        body: JSON.stringify({
          model: config.fallbackModel,
          messages: options.messages,
          temperature: options.temperature ?? config.temperature,
          max_tokens: options.maxTokens ?? config.maxTokens,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "";

    return {
      content,
      model: config.fallbackModel,
      provider: "openrouter",
      tokensUsed: data.usage?.total_tokens,
    };
  }

  /**
   * Helper: Completion com parsing de JSON
   */
  async completeJSON<T>(options: AICompletionOptions): Promise<T> {
    const result = await this.complete({
      ...options,
      jsonMode: true,
    });

    // Limpar resposta de markdown code blocks
    let cleanedContent = result.content.trim();
    if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");
    }

    try {
      return JSON.parse(cleanedContent) as T;
    } catch (error) {
      console.error("[AIService] Erro ao parsear JSON:", cleanedContent);
      throw new Error("Resposta da IA não é um JSON válido");
    }
  }

  /**
   * Obter configuração de uma tarefa
   */
  getTaskConfig(task: TaskType) {
    return TASK_CONFIG[task];
  }

  /**
   * Listar todas as tarefas configuradas
   */
  listTasks() {
    return Object.entries(TASK_CONFIG).map(([task, config]) => ({
      task,
      ...config,
    }));
  }

  /**
   * Verificar status dos providers
   */
  getProviderStatus() {
    return {
      groq: {
        available: !!this.groqClient,
        configured: !!process.env.GROQ_API_KEY,
      },
      openrouter: {
        available: !!this.openrouterApiKey,
        configured: !!process.env.OPENROUTER_API_KEY,
      },
    };
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}

// ========================================
// HELPERS PARA USO DIRETO
// ========================================

/**
 * Completion rápido para uma tarefa
 */
export async function aiComplete(
  task: TaskType,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const ai = getAIService();
  const messages: AIMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const result = await ai.complete({ task, messages });
  return result.content;
}

/**
 * Completion com JSON parsing
 */
export async function aiCompleteJSON<T>(
  task: TaskType,
  prompt: string,
  systemPrompt?: string
): Promise<T> {
  const ai = getAIService();
  const messages: AIMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  return ai.completeJSON<T>({ task, messages });
}
