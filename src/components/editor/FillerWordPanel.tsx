"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Play,
  Check,
  X,
  RefreshCw,
  Volume2,
  Zap,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface FillerWord {
  id: string;
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
  isRemoved: boolean;
}

interface FillerStats {
  totalCount: number;
  removedCount: number;
  timeSaved: number;
  byType: Record<string, number>;
}

interface FillerWordPanelProps {
  projectId: string;
  onPlayTime?: (time: number) => void;
  className?: string;
}

export function FillerWordPanel({
  projectId,
  onPlayTime,
  className,
}: FillerWordPanelProps) {
  const [fillers, setFillers] = useState<FillerWord[]>([]);
  const [stats, setStats] = useState<FillerStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [selectedFillers, setSelectedFillers] = useState<Set<string>>(new Set());

  // Load fillers on mount
  useEffect(() => {
    loadFillers();
  }, [projectId]);

  const loadFillers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/fillers`);
      const data = await response.json();

      if (data.success) {
        setFillers(data.fillers);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error loading fillers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const detectFillers = async () => {
    setIsDetecting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/fillers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "pt", reprocess: true }),
      });

      const data = await response.json();

      if (data.success) {
        setFillers(data.fillers || []);
        setStats(data.stats);
        toast.success(`Detectados ${data.stats.totalCount} filler words`);
      } else {
        toast.error("Erro ao detectar fillers");
      }
    } catch (error) {
      console.error("Error detecting fillers:", error);
      toast.error("Erro ao detectar fillers");
    } finally {
      setIsDetecting(false);
    }
  };

  const markForRemoval = async (fillerIds: string[], remove: boolean) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/fillers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: remove ? "remove" : "keep",
          fillerIds,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setFillers((prev) =>
          prev.map((f) =>
            fillerIds.includes(f.id) ? { ...f, isRemoved: remove } : f
          )
        );
        setStats(data.stats);
        setSelectedFillers(new Set());
      }
    } catch (error) {
      console.error("Error marking fillers:", error);
      toast.error("Erro ao atualizar fillers");
    }
  };

  const removeAllFillers = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/fillers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove_all",
          minConfidence: 0.7,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${data.removedCount} fillers marcados para remocao`);
        loadFillers();
      }
    } catch (error) {
      console.error("Error removing all fillers:", error);
      toast.error("Erro ao remover fillers");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleSelection = (fillerId: string) => {
    setSelectedFillers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fillerId)) {
        newSet.delete(fillerId);
      } else {
        newSet.add(fillerId);
      }
      return newSet;
    });
  };

  const groupedFillers = fillers.reduce((acc, filler) => {
    const key = filler.word.toLowerCase();
    if (!acc[key]) acc[key] = [];
    acc[key].push(filler);
    return acc;
  }, {} as Record<string, FillerWord[]>);

  return (
    <div className={cn("flex flex-col h-full bg-zinc-900", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" />
          <h3 className="font-semibold text-white">Filler Words</h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={detectFillers}
          disabled={isDetecting}
          className="text-zinc-400 hover:text-white"
        >
          {isDetecting ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Detectar</span>
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 p-4 border-b border-zinc-800">
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">
              {stats.totalCount}
            </div>
            <div className="text-xs text-zinc-500">Detectados</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-400">
              {stats.removedCount}
            </div>
            <div className="text-xs text-zinc-500">Removidos</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {stats.timeSaved.toFixed(1)}s
            </div>
            <div className="text-xs text-zinc-500">Economizado</div>
          </div>
        </div>
      )}

      {/* Actions */}
      {fillers.length > 0 && (
        <div className="flex items-center gap-2 p-3 border-b border-zinc-800">
          <Button
            size="sm"
            variant="destructive"
            onClick={removeAllFillers}
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remover Todos
          </Button>
          {selectedFillers.size > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => markForRemoval(Array.from(selectedFillers), true)}
                className="border-red-500/50 text-red-400 hover:bg-red-500/20"
              >
                <X className="h-4 w-4 mr-1" />
                {selectedFillers.size}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => markForRemoval(Array.from(selectedFillers), false)}
                className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20"
              >
                <Check className="h-4 w-4 mr-1" />
                Manter
              </Button>
            </>
          )}
        </div>
      )}

      {/* Filler List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 text-zinc-500 animate-spin" />
          </div>
        ) : fillers.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              Nenhum filler word detectado.
            </p>
            <p className="text-zinc-600 text-xs mt-1">
              Clique em "Detectar" para analisar.
            </p>
          </div>
        ) : (
          Object.entries(groupedFillers).map(([word, wordFillers]) => (
            <div
              key={word}
              className="bg-zinc-800/50 rounded-lg overflow-hidden"
            >
              {/* Group Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white capitalize">
                    "{word}"
                  </span>
                  <span className="text-xs bg-zinc-700 px-2 py-0.5 rounded text-zinc-400">
                    {wordFillers.length}x
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    markForRemoval(
                      wordFillers.map((f) => f.id),
                      true
                    )
                  }
                  className="h-6 text-xs text-zinc-400 hover:text-red-400"
                >
                  Remover todos
                </Button>
              </div>

              {/* Individual Fillers */}
              <div className="divide-y divide-zinc-700/50">
                {wordFillers.slice(0, 5).map((filler) => (
                  <motion.div
                    key={filler.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                      filler.isRemoved
                        ? "bg-red-500/10"
                        : "hover:bg-zinc-700/30",
                      selectedFillers.has(filler.id) && "bg-blue-500/20"
                    )}
                    onClick={() => toggleSelection(filler.id)}
                  >
                    {/* Checkbox */}
                    <div
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center",
                        selectedFillers.has(filler.id)
                          ? "bg-blue-500 border-blue-500"
                          : "border-zinc-600"
                      )}
                    >
                      {selectedFillers.has(filler.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>

                    {/* Time */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTime?.(filler.startTime);
                      }}
                      className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
                    >
                      <Play className="h-3 w-3" />
                      {formatTime(filler.startTime)}
                    </button>

                    {/* Confidence */}
                    <div
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        filler.confidence >= 0.8
                          ? "bg-emerald-500/20 text-emerald-400"
                          : filler.confidence >= 0.6
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-zinc-600/30 text-zinc-500"
                      )}
                    >
                      {Math.round(filler.confidence * 100)}%
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-1 text-xs text-zinc-500 ml-auto">
                      <Clock className="h-3 w-3" />
                      {((filler.endTime - filler.startTime) * 1000).toFixed(0)}ms
                    </div>

                    {/* Status */}
                    {filler.isRemoved && (
                      <span className="text-xs text-red-400">Removido</span>
                    )}
                  </motion.div>
                ))}

                {wordFillers.length > 5 && (
                  <div className="px-3 py-2 text-xs text-zinc-500 text-center">
                    +{wordFillers.length - 5} mais
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {stats && stats.removedCount > 0 && (
        <div className="p-3 border-t border-zinc-800 bg-emerald-500/10">
          <p className="text-xs text-emerald-400 text-center">
            {stats.removedCount} fillers serao removidos no export
            ({stats.timeSaved.toFixed(1)}s economizados)
          </p>
        </div>
      )}
    </div>
  );
}
