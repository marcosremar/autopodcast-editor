"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  ChevronRight,
  MessageSquare,
  Trash2,
  Wand2,
  Mic,
  LayoutTemplate,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  TemplateStatusCard,
  QuickActionsBar,
  ProgressCard,
  SectionDetailCard,
  GapAnalysisCard,
  MiniTimeline,
  type TemplateSection,
  type QuickAction,
} from "./ChatComponents";

// Extended action types for agent-first interface
interface EditAction {
  type: "select" | "deselect" | "reorder" | "focus" | "remove_topic" | "add_transition" | "info" |
        "show_template" | "auto_map" | "record_section" | "show_gaps" | "export";
  segmentIds?: string[];
  message: string;
  sectionId?: string;
  data?: any;
}

// Rich content types for agent messages
interface RichContent {
  type: "template_status" | "quick_actions" | "progress" | "section_detail" | "gap_analysis" | "mini_timeline";
  data: any;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: EditAction[];
  richContent?: RichContent[];
  timestamp: Date;
}

interface EditorChatProps {
  projectId: string;
  userId: string;
  onAction: (action: EditAction) => void;
  isOpen: boolean;
  onToggle: () => void;
  inline?: boolean;
  // Template data for agent-first UI
  templateData?: {
    name: string;
    sections: TemplateSection[];
    gaps: { sectionName: string; missingDuration: number; suggestion: string }[];
  };
}

export function EditorChat({
  projectId,
  userId,
  onAction,
  isOpen,
  onToggle,
  inline = false,
  templateData,
}: EditorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with agent-first welcome
  useEffect(() => {
    const initialMessage: ChatMessage = {
      role: "assistant",
      content: "Ola! Sou seu assistente de edicao com IA. Como posso ajudar?",
      richContent: [
        {
          type: "quick_actions",
          data: {
            actions: [
              { id: "1", label: "Ver Template", icon: "template", variant: "secondary", action: "show_template" },
              { id: "2", label: "Auto-Mapear", icon: "wand", variant: "primary", action: "auto_map" },
              { id: "3", label: "Ver Gaps", icon: "template", variant: "secondary", action: "show_gaps" },
              { id: "4", label: "Gravar", icon: "mic", variant: "secondary", action: "record" },
            ],
          },
        },
      ],
      timestamp: new Date(),
    };
    setMessages([initialMessage]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Load chat history
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const response = await fetch(`/api/chat/${projectId}`);
        if (!response.ok) throw new Error("Failed to load history");

        const data = await response.json();

        if (data.messages && data.messages.length > 0) {
          const loadedMessages = data.messages.map((m: any) => ({
            role: m.role,
            content: m.content,
            actions: m.actions,
            richContent: m.richContent,
            timestamp: new Date(m.timestamp),
          }));
          setMessages(loadedMessages);
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
      }
    };

    loadChatHistory();
  }, [projectId]);

  const handleQuickAction = async (actionId: string) => {
    // Handle quick actions from buttons
    switch (actionId) {
      case "show_template":
        await sendSystemMessage("Mostre o status do template");
        break;
      case "auto_map":
        await sendSystemMessage("Execute o auto-mapeamento com IA");
        break;
      case "show_gaps":
        await sendSystemMessage("Quais secoes precisam de conteudo?");
        break;
      case "record":
        toast.info("Funcao de gravacao em desenvolvimento");
        break;
      default:
        // Execute as regular action
        onAction({ type: actionId as any, message: actionId });
    }
  };

  const sendSystemMessage = async (message: string) => {
    setInput(message);
    // Small delay to show the input change
    setTimeout(() => {
      sendMessage(message);
    }, 100);
  };

  const sendMessage = async (overrideMessage?: string) => {
    const messageToSend = overrideMessage || input.trim();
    if (!messageToSend || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: messageToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          userId,
          message: messageToSend,
          includeTemplateContext: true, // Tell API to include template data
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.response,
        actions: data.actions,
        richContent: data.richContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-execute certain actions
      if (data.actions && Array.isArray(data.actions)) {
        for (const action of data.actions) {
          if (action.type === "focus" && action.segmentIds && action.segmentIds.length > 0) {
            executeAction(action);
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "Desculpe, ocorreu um erro. Tente novamente.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const executeAction = (action: EditAction) => {
    onAction(action);
  };

  const handleClearHistory = async () => {
    if (!confirm("Limpar todo o historico do chat?")) return;

    try {
      await fetch(`/api/chat/${projectId}`, { method: "DELETE" });

      // Reset with welcome message
      setMessages([{
        role: "assistant",
        content: "Historico limpo! Como posso ajudar?",
        richContent: [
          {
            type: "quick_actions",
            data: {
              actions: [
                { id: "1", label: "Ver Template", icon: "template", variant: "secondary", action: "show_template" },
                { id: "2", label: "Auto-Mapear", icon: "wand", variant: "primary", action: "auto_map" },
              ],
            },
          },
        ],
        timestamp: new Date(),
      }]);

      toast.success("Historico limpo!");
    } catch (error) {
      toast.error("Erro ao limpar historico");
    }
  };

  // Render rich content components
  const renderRichContent = (richContent: RichContent[]) => {
    return richContent.map((content, index) => {
      switch (content.type) {
        case "template_status":
          return (
            <TemplateStatusCard
              key={index}
              templateName={content.data.templateName || "Template"}
              sections={content.data.sections || []}
              onSectionClick={(sectionId) => {
                sendSystemMessage(`Me fale sobre a secao ${sectionId}`);
              }}
            />
          );

        case "quick_actions":
          return (
            <QuickActionsBar
              key={index}
              actions={content.data.actions || []}
              onAction={handleQuickAction}
            />
          );

        case "progress":
          return (
            <ProgressCard
              key={index}
              title={content.data.title || "Progresso"}
              stats={content.data.stats || []}
            />
          );

        case "section_detail":
          return (
            <SectionDetailCard
              key={index}
              section={content.data.section}
              suggestion={content.data.suggestion}
              onRecord={() => toast.info("Gravacao em desenvolvimento")}
              onAutoFill={() => sendSystemMessage(`Auto-preencher secao ${content.data.section?.name}`)}
            />
          );

        case "gap_analysis":
          return (
            <GapAnalysisCard
              key={index}
              gaps={content.data.gaps || []}
              onFillGap={(sectionName) => {
                sendSystemMessage(`Ajude-me a preencher a secao ${sectionName}`);
              }}
            />
          );

        case "mini_timeline":
          return (
            <MiniTimeline
              key={index}
              segments={content.data.segments || []}
              totalDuration={content.data.totalDuration || 0}
            />
          );

        default:
          return null;
      }
    });
  };

  return (
    <>
      {/* Toggle Button (when closed) */}
      {!inline && (
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={onToggle}
              className="fixed right-4 bottom-4 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-lg shadow-emerald-500/30 transition-all"
            >
              <Sparkles className="h-5 w-5" />
              <span className="font-medium">Assistente IA</span>
            </motion.button>
          )}
        </AnimatePresence>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className={cn(
            "flex flex-col bg-zinc-900",
            inline
              ? "h-full w-full"
              : "fixed right-0 top-0 h-full w-[420px] border-l border-zinc-800 shadow-2xl z-50"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-zinc-900" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Assistente AeroPod</h3>
                <p className="text-xs text-zinc-500">Edite com comandos naturais</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Limpar historico"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              {!inline && (
                <button
                  onClick={onToggle}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "flex-row-reverse" : ""
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                    message.role === "user"
                      ? "bg-blue-500"
                      : "bg-gradient-to-br from-emerald-500/20 to-blue-500/20"
                  )}
                >
                  {message.role === "user" ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                  )}
                </div>

                {/* Content */}
                <div
                  className={cn(
                    "flex-1 max-w-[85%]",
                    message.role === "user" ? "text-right" : ""
                  )}
                >
                  <div
                    className={cn(
                      "inline-block p-3 rounded-2xl text-sm prose prose-invert prose-sm max-w-none",
                      message.role === "user"
                        ? "bg-blue-500 text-white rounded-br-md"
                        : "bg-zinc-800 text-zinc-200 rounded-bl-md"
                    )}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="space-y-1 my-2 ml-1">{children}</ul>,
                        li: ({ children }) => (
                          <li className="flex gap-2 items-start">
                            <span className="text-emerald-400 shrink-0">•</span>
                            <span className="flex-1">{children}</span>
                          </li>
                        ),
                        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                        code: ({ children }) => (
                          <code className="bg-zinc-700 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  {/* Rich Content Components */}
                  {message.richContent && message.richContent.length > 0 && (
                    <div className="mt-2">
                      {renderRichContent(message.richContent)}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {message.actions.map((action, actionIndex) => (
                        <motion.button
                          key={actionIndex}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: actionIndex * 0.05 }}
                          onClick={() => executeAction(action)}
                          className={cn(
                            "flex items-center gap-2 w-full p-2.5 rounded-xl text-left text-sm transition-all",
                            action.type === "select" && "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400",
                            action.type === "deselect" && "bg-red-500/20 hover:bg-red-500/30 text-red-400",
                            action.type === "focus" && "bg-blue-500/20 hover:bg-blue-500/30 text-blue-400",
                            action.type === "auto_map" && "bg-purple-500/20 hover:bg-purple-500/30 text-purple-400",
                            action.type === "info" && "bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300"
                          )}
                        >
                          {action.type === "select" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                          {action.type === "deselect" && <XCircle className="h-4 w-4 shrink-0" />}
                          {action.type === "focus" && <Sparkles className="h-4 w-4 shrink-0" />}
                          {action.type === "auto_map" && <Wand2 className="h-4 w-4 shrink-0" />}
                          <span className="flex-1">{action.message}</span>
                          {action.segmentIds && action.segmentIds.length > 0 && (
                            <span className="text-xs opacity-60">{action.segmentIds.length} seg.</span>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] text-zinc-600 mt-1">
                    {message.timestamp.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
                </div>
                <div className="bg-zinc-800 rounded-2xl rounded-bl-md p-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Smart Suggestions */}
          <div className="px-4 py-2 border-t border-zinc-800/50">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {[
                { label: "Status do template", icon: LayoutTemplate },
                { label: "Auto-mapear", icon: Wand2 },
                { label: "Ver gaps", icon: TrendingUp },
                { label: "Selecionar tudo", icon: CheckCircle2 },
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setInput(suggestion.label)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs rounded-full transition-colors"
                >
                  <suggestion.icon className="h-3 w-3" />
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-xl">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Pergunte algo ou de um comando..."
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="p-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-xl transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
