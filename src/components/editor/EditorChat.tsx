"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditAction {
  type: "select" | "deselect" | "reorder" | "focus" | "remove_topic" | "add_transition" | "info";
  segmentIds?: string[];
  message: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: EditAction[];
  timestamp: Date;
}

interface EditorChatProps {
  projectId: string;
  onAction: (action: EditAction) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function EditorChat({ projectId, onAction, isOpen, onToggle }: EditorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Ola! Sou seu assistente de edicao. Posso ajudar a:\n\n- Selecionar segmentos sobre um topico\n- Remover partes repetitivas\n- Focar em assuntos especificos\n- Reorganizar a narrativa\n\nO que voce gostaria de fazer?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
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
          message: userMessage.content,
          history: messages.map(m => ({ role: m.role, content: m.content })),
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
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.",
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

  return (
    <>
      {/* Toggle Button (when closed) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={onToggle}
            className="fixed right-4 bottom-4 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-lg shadow-emerald-500/30 transition-all"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="font-medium">Chat de Edicao</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[400px] bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <Bot className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Assistente de Edicao</h3>
                  <p className="text-xs text-zinc-500">Edite com comandos naturais</p>
                </div>
              </div>
              <button
                onClick={onToggle}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
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
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      message.role === "user"
                        ? "bg-blue-500"
                        : "bg-emerald-500/20"
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
                        "inline-block p-3 rounded-2xl text-sm",
                        message.role === "user"
                          ? "bg-blue-500 text-white rounded-br-md"
                          : "bg-zinc-800 text-zinc-200 rounded-bl-md"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>

                    {/* Actions */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.actions.map((action, actionIndex) => (
                          <motion.button
                            key={actionIndex}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: actionIndex * 0.1 }}
                            onClick={() => executeAction(action)}
                            className={cn(
                              "flex items-center gap-2 w-full p-3 rounded-xl text-left text-sm transition-all",
                              action.type === "select" && "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400",
                              action.type === "deselect" && "bg-red-500/20 hover:bg-red-500/30 text-red-400",
                              action.type === "focus" && "bg-blue-500/20 hover:bg-blue-500/30 text-blue-400",
                              action.type === "info" && "bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300",
                              !["select", "deselect", "focus", "info"].includes(action.type) && "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400"
                            )}
                          >
                            {action.type === "select" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                            {action.type === "deselect" && <XCircle className="h-4 w-4 shrink-0" />}
                            {action.type === "focus" && <Sparkles className="h-4 w-4 shrink-0" />}
                            <span className="flex-1">{action.message}</span>
                            {action.segmentIds && action.segmentIds.length > 0 && (
                              <span className="text-xs opacity-60">
                                {action.segmentIds.length} seg.
                              </span>
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

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
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

            {/* Suggestions */}
            <div className="px-4 py-2 border-t border-zinc-800/50">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {[
                  "Focar em IA",
                  "Remover repeticoes",
                  "Adicionar transicoes",
                  "Resumir mais",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="shrink-0 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs rounded-full transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-zinc-800">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite um comando de edicao..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
