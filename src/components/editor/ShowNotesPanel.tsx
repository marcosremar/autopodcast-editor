"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  RefreshCw,
  Download,
  Edit2,
  Check,
  X,
  Clock,
  List,
  Users,
  Link,
  Play,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Chapter {
  title: string;
  timestamp: number;
  description?: string;
}

interface Guest {
  name: string;
  bio?: string;
  role?: string;
}

interface ShowNotes {
  id: string;
  summary: string;
  chapters: Chapter[];
  keyPoints: string[];
  guestInfo?: Guest[];
  links?: string[];
  generatedAt: string;
}

interface ShowNotesPanelProps {
  projectId: string;
  onSeekTo?: (time: number) => void;
  className?: string;
}

export function ShowNotesPanel({
  projectId,
  onSeekTo,
  className,
}: ShowNotesPanelProps) {
  const [showNotes, setShowNotes] = useState<ShowNotes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    loadShowNotes();
  }, [projectId]);

  const loadShowNotes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/show-notes`);

      if (response.ok) {
        const data = await response.json();
        setShowNotes(data.showNotes);
      } else if (response.status === 404) {
        setShowNotes(null);
      }
    } catch (error) {
      console.error("Error loading show notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateShowNotes = async (regenerate: boolean = false) => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/show-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate }),
      });

      const data = await response.json();

      if (data.success) {
        setShowNotes(data.showNotes);
        toast.success("Show notes geradas!");
      } else {
        toast.error(data.error || "Erro ao gerar show notes");
      }
    } catch (error) {
      console.error("Error generating show notes:", error);
      toast.error("Erro ao gerar show notes");
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateSection = async (section: "summary" | "chapters" | "keyPoints") => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/show-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section }),
      });

      const data = await response.json();

      if (data.success) {
        setShowNotes(data.showNotes);
        toast.success(`${section} regenerado!`);
      }
    } catch (error) {
      console.error("Error regenerating section:", error);
      toast.error("Erro ao regenerar");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateShowNotes = async (updates: Partial<ShowNotes>) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/show-notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (data.success) {
        setShowNotes(data.showNotes);
        setEditingSection(null);
        toast.success("Atualizado!");
      }
    } catch (error) {
      console.error("Error updating show notes:", error);
      toast.error("Erro ao atualizar");
    }
  };

  const downloadShowNotes = async (format: "markdown" | "text") => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/show-notes?format=${format}`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `show-notes.${format === "markdown" ? "md" : "txt"}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error downloading:", error);
      toast.error("Erro ao baixar");
    }
  };

  const formatTimestamp = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <RefreshCw className="h-6 w-6 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (!showNotes) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full p-8 bg-zinc-900", className)}>
        {/* Animated illustration */}
        <div className="relative w-32 h-32 mb-6">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl animate-pulse" />

          {/* Document mockup */}
          <div className="absolute inset-4 bg-zinc-800 rounded-xl border border-zinc-700 p-3 space-y-2">
            <div className="h-2 bg-zinc-600 rounded w-3/4" />
            <div className="h-2 bg-zinc-700 rounded w-full" />
            <div className="h-2 bg-zinc-700 rounded w-5/6" />
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                <div className="h-1.5 bg-zinc-700 rounded flex-1" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                <div className="h-1.5 bg-zinc-700 rounded w-4/5" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                <div className="h-1.5 bg-zinc-700 rounded w-3/4" />
              </div>
            </div>
          </div>

          {/* Floating badges */}
          <motion.div
            className="absolute -top-1 -right-1 px-2 py-1 bg-blue-500 rounded-lg text-[10px] text-white font-medium shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.1, 1] }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            AI
          </motion.div>
          <motion.div
            className="absolute -bottom-2 -left-1 p-1.5 bg-cyan-500 rounded-lg shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.1, 1] }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <List className="h-3 w-3 text-white" />
          </motion.div>
        </div>

        <h3 className="text-lg font-medium text-white mb-2">Show Notes</h3>
        <p className="text-sm text-zinc-500 text-center mb-6 max-w-[240px]">
          Gere resumo, capitulos e pontos-chave automaticamente com IA
        </p>

        <Button
          onClick={() => generateShowNotes()}
          disabled={isGenerating}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-medium"
        >
          {isGenerating ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <FileText className="h-4 w-4 mr-2" />
          )}
          Gerar Show Notes
        </Button>

        {/* Features list */}
        <div className="mt-8 space-y-3 w-full max-w-[200px]">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
              <FileText className="h-4 w-4 text-blue-400" />
            </div>
            <span className="text-zinc-400">Resumo do episodio</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
              <Clock className="h-4 w-4 text-cyan-400" />
            </div>
            <span className="text-zinc-400">Capitulos com timestamps</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
              <List className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-zinc-400">Pontos-chave</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-zinc-900", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-400" />
          <h3 className="font-semibold text-white">Show Notes</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => generateShowNotes(true)}
            disabled={isGenerating}
            className="text-zinc-400 hover:text-white"
          >
            <RefreshCw
              className={cn("h-4 w-4", isGenerating && "animate-spin")}
            />
          </Button>
          <div className="relative group">
            <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white">
              <Download className="h-4 w-4" />
            </Button>
            <div className="absolute right-0 top-full mt-1 bg-zinc-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-10">
              <button
                onClick={() => downloadShowNotes("markdown")}
                className="block w-full px-4 py-2 text-sm text-left text-white hover:bg-zinc-700 rounded-t-lg"
              >
                Markdown (.md)
              </button>
              <button
                onClick={() => downloadShowNotes("text")}
                className="block w-full px-4 py-2 text-sm text-left text-white hover:bg-zinc-700 rounded-b-lg"
              >
                Texto (.txt)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-3 bg-zinc-800">
          <TabsTrigger value="summary" className="flex-1">Resumo</TabsTrigger>
          <TabsTrigger value="chapters" className="flex-1">Capitulos</TabsTrigger>
          <TabsTrigger value="points" className="flex-1">Pontos</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="flex-1 overflow-y-auto p-4">
          <div className="bg-zinc-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white">Resumo do Episodio</h4>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => regenerateSection("summary")}
                  disabled={isGenerating}
                  className="h-7 px-2 text-zinc-400"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingSection("summary");
                    setEditValue(showNotes.summary);
                  }}
                  className="h-7 px-2 text-zinc-400"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {editingSection === "summary" ? (
              <div>
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full h-40 bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-white resize-none focus:outline-none focus:border-blue-500"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingSection(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateShowNotes({ summary: editValue })}
                    className="bg-blue-500"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                {showNotes.summary}
              </p>
            )}
          </div>

          {/* Guests */}
          {showNotes.guestInfo && showNotes.guestInfo.length > 0 && (
            <div className="bg-zinc-800/50 rounded-lg p-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-zinc-400" />
                <h4 className="text-sm font-medium text-white">Convidados</h4>
              </div>
              <div className="space-y-3">
                {showNotes.guestInfo.map((guest, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white font-medium text-sm">
                      {guest.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        {guest.name}
                        {guest.role && (
                          <span className="text-zinc-500 font-normal ml-2">
                            {guest.role}
                          </span>
                        )}
                      </div>
                      {guest.bio && (
                        <p className="text-xs text-zinc-400">{guest.bio}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {showNotes.links && showNotes.links.length > 0 && (
            <div className="bg-zinc-800/50 rounded-lg p-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Link className="h-4 w-4 text-zinc-400" />
                <h4 className="text-sm font-medium text-white">Links Mencionados</h4>
              </div>
              <div className="space-y-2">
                {showNotes.links.map((link, i) => (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-blue-400 hover:underline truncate"
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Chapters Tab */}
        <TabsContent value="chapters" className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">
              {showNotes.chapters.length} Capitulos
            </h4>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => regenerateSection("chapters")}
              disabled={isGenerating}
              className="text-zinc-400"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Regenerar
            </Button>
          </div>

          <div className="space-y-2">
            {showNotes.chapters.map((chapter, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onSeekTo?.(chapter.timestamp)}
                className="w-full flex items-center gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors text-left group"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 font-mono text-xs">
                  {formatTimestamp(chapter.timestamp)}
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-medium text-white truncate">
                    {chapter.title}
                  </h5>
                  {chapter.description && (
                    <p className="text-xs text-zinc-500 truncate">
                      {chapter.description}
                    </p>
                  )}
                </div>
                <Play className="h-4 w-4 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </div>
        </TabsContent>

        {/* Key Points Tab */}
        <TabsContent value="points" className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">
              {showNotes.keyPoints.length} Pontos-Chave
            </h4>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => regenerateSection("keyPoints")}
              disabled={isGenerating}
              className="text-zinc-400"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Regenerar
            </Button>
          </div>

          <div className="space-y-2">
            {showNotes.keyPoints.map((point, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg"
              >
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                  <ChevronRight className="h-4 w-4 text-blue-400" />
                </div>
                <p className="text-sm text-zinc-300">{point}</p>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
