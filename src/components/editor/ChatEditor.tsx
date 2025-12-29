"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Play,
  Clock,
  Scissors,
  ArrowRight,
  Wand2,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Segment } from "@/lib/db/schema";
import { EditPreview, PreviewSegment, EditDiff } from "./EditPreview";

interface EditAction {
  type: "select" | "deselect" | "reorder" | "focus" | "remove_topic" | "add_transition" | "info" | "preview";
  segmentIds?: string[];
  message: string;
  preview?: {
    before: PreviewSegment[];
    after: PreviewSegment[];
  };
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: EditAction[];
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatEditorProps {
  projectId: string;
  segments: Segment[];
  onAction: (action: EditAction) => void;
  onPlaySegment?: (segment: Segment) => void;
}

export function ChatEditor({ projectId, segments, onAction, onPlaySegment }: ChatEditorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Ola! Sou seu assistente de edicao de podcast. Posso ajudar a editar seu episodio de forma conversacional.\n\nAlgumas coisas que posso fazer:\n- \"Foque mais nos momentos sobre IA\"\n- \"Remova as partes repetitivas\"\n- \"Selecione apenas os melhores momentos\"\n- \"Como esta ficando a edicao?\"\n\nO que gostaria de fazer?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  // Convert Segment to PreviewSegment
  const toPreviewSegment = useCallback((segment: Segment): PreviewSegment => ({
    id: segment.id,
    text: segment.text,
    topic: segment.topic || undefined,
    startTime: segment.startTime,
    endTime: segment.endTime,
    isSelected: segment.isSelected || false,
    interestScore: segment.interestScore ?? undefined,
  }), []);

  // Get current edit summary
  const getEditSummary = useCallback(() => {
    const selected = segments.filter(s => s.isSelected);
    const totalDuration = segments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
    const editedDuration = selected.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
    const reduction = totalDuration > 0 ? Math.round((1 - editedDuration / totalDuration) * 100) : 0;

    return {
      selected,
      total: segments.length,
      selectedCount: selected.length,
      totalDuration,
      editedDuration,
      reduction,
    };
  }, [segments]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Add streaming placeholder
    const streamingId = `assistant-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: streamingId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          message: userMessage.content,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      // Build preview data if there are segment actions
      let previewAction: EditAction | undefined;
      if (data.actions && data.actions.length > 0) {
        const selectActions = data.actions.filter((a: EditAction) => a.type === "select" || a.type === "deselect");
        if (selectActions.length > 0) {
          const beforeSegments = segments.filter(s => s.isSelected).map(toPreviewSegment);

          // Calculate "after" state
          const newSelectedIds = new Set(segments.filter(s => s.isSelected).map(s => s.id));
          selectActions.forEach((action: EditAction) => {
            if (action.segmentIds) {
              action.segmentIds.forEach(id => {
                if (action.type === "select") {
                  newSelectedIds.add(id);
                } else {
                  newSelectedIds.delete(id);
                }
              });
            }
          });

          const afterSegments = segments
            .filter(s => newSelectedIds.has(s.id))
            .map(toPreviewSegment);

          previewAction = {
            type: "preview",
            message: "Ver mudancas propostas",
            preview: {
              before: beforeSegments,
              after: afterSegments,
            },
          };
        }
      }

      const assistantMessage: ChatMessage = {
        id: streamingId,
        role: "assistant",
        content: data.response,
        actions: previewAction ? [...(data.actions || []), previewAction] : data.actions,
        timestamp: new Date(),
        isStreaming: false,
      };

      setMessages(prev => prev.map(m => m.id === streamingId ? assistantMessage : m));
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => prev.map(m =>
        m.id === streamingId
          ? {
              ...m,
              content: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.",
              isStreaming: false,
            }
          : m
      ));
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
    if (action.type === "preview") return; // Preview is just visual
    onAction(action);
  };

  const applyAllActions = (actions: EditAction[]) => {
    actions.forEach(action => {
      if (action.type !== "preview" && action.type !== "info") {
        onAction(action);
      }
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const summary = getEditSummary();

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20">
          <Wand2 className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-white">Editor IA</h2>
          <p className="text-xs text-zinc-500">Edite seu podcast conversando</p>
        </div>
        {/* Current Edit Status */}
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-1.5">
            <Scissors className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-400">{formatTime(summary.editedDuration)}</span>
          </div>
          <span className="text-xs text-zinc-600">|</span>
          <span className="text-xs text-amber-400">-{summary.reduction}%</span>
          <span className="text-xs text-zinc-600">|</span>
          <span className="text-xs text-zinc-400">{summary.selectedCount}/{summary.total}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-4",
              message.role === "user" ? "flex-row-reverse" : ""
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                message.role === "user"
                  ? "bg-blue-500"
                  : "bg-gradient-to-br from-emerald-500/30 to-blue-500/30"
              )}
            >
              {message.role === "user" ? (
                <User className="h-5 w-5 text-white" />
              ) : (
                <Sparkles className="h-5 w-5 text-emerald-400" />
              )}
            </div>

            {/* Content */}
            <div className={cn("flex-1 max-w-[85%]", message.role === "user" ? "text-right" : "")}>
              {message.isStreaming ? (
                <div className="inline-block p-4 rounded-2xl bg-zinc-800/50 rounded-bl-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className={cn(
                      "inline-block p-4 rounded-2xl text-sm leading-relaxed",
                      message.role === "user"
                        ? "bg-blue-500 text-white rounded-br-md"
                        : "bg-zinc-800/50 text-zinc-200 rounded-bl-md"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {/* Actions & Preview */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {/* Preview Card */}
                      {message.actions.some(a => a.type === "preview" && a.preview) && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          {(() => {
                            const previewAction = message.actions!.find(a => a.type === "preview" && a.preview);
                            if (!previewAction?.preview) return null;
                            return (
                              <EditDiff
                                before={previewAction.preview.before}
                                after={previewAction.preview.after}
                                onApply={() => {
                                  const actionsToApply = message.actions!.filter(a => a.type !== "preview" && a.type !== "info");
                                  applyAllActions(actionsToApply);
                                }}
                              />
                            );
                          })()}
                        </motion.div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {message.actions
                          .filter(a => a.type !== "preview")
                          .map((action, actionIndex) => (
                            <motion.button
                              key={actionIndex}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: actionIndex * 0.05 }}
                              onClick={() => executeAction(action)}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all",
                                action.type === "select" && "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30",
                                action.type === "deselect" && "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30",
                                action.type === "focus" && "bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30",
                                action.type === "info" && "bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300 border border-zinc-600",
                                !["select", "deselect", "focus", "info"].includes(action.type) && "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30"
                              )}
                            >
                              {action.type === "select" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                              {action.type === "deselect" && <XCircle className="h-4 w-4 shrink-0" />}
                              {action.type === "focus" && <Eye className="h-4 w-4 shrink-0" />}
                              <span>{action.message}</span>
                              {action.segmentIds && action.segmentIds.length > 0 && (
                                <span className="text-xs opacity-60 ml-1">
                                  ({action.segmentIds.length})
                                </span>
                              )}
                            </motion.button>
                          ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-zinc-600 mt-2">
                    {message.timestamp.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </>
              )}
            </div>
          </motion.div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      <div className="px-4 py-2 border-t border-zinc-800/50">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            "Mostre a edicao atual",
            "Selecione os melhores momentos",
            "Remova repeticoes",
            "Foque em IA",
            "Como posso melhorar?",
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              className="shrink-0 px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs rounded-full transition-colors border border-zinc-700/50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Digite um comando de edicao..."
              rows={1}
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-xl transition-colors shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-zinc-600 mt-2 text-center">
          Enter para enviar, Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
}
