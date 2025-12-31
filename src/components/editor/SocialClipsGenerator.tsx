"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scissors,
  Play,
  Pause,
  Download,
  RefreshCw,
  Sparkles,
  Clock,
  TrendingUp,
  Share2,
  Check,
  X,
  Type,
  Smartphone,
  Square,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface ClipSuggestion {
  segmentIds: string[];
  startTime: number;
  endTime: number;
  duration: number;
  title: string;
  description: string;
  hookScore: number;
  viralPotential: number;
  hookText: string;
  reason: string;
}

interface SavedClip {
  id: string;
  title: string;
  duration: number;
  status: string;
  hookScore: number;
  viralPotential: number;
  clipUrl?: string;
  format: string;
}

interface SocialClipsGeneratorProps {
  projectId: string;
  onPlaySegment?: (startTime: number) => void;
  className?: string;
}

export function SocialClipsGenerator({
  projectId,
  onPlaySegment,
  className,
}: SocialClipsGeneratorProps) {
  const [suggestions, setSuggestions] = useState<ClipSuggestion[]>([]);
  const [savedClips, setSavedClips] = useState<SavedClip[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [addCaptions, setAddCaptions] = useState(true);
  const [captionStyle, setCaptionStyle] = useState<"animated" | "static">("animated");

  // Load existing clips
  useEffect(() => {
    loadClips();
  }, [projectId]);

  const loadClips = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/clips`);
      const data = await response.json();

      if (data.success) {
        setSavedClips(data.clips);
      }
    } catch (error) {
      console.error("Error loading clips:", error);
    }
  };

  const generateSuggestions = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/clips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5, save: false }),
      });

      const data = await response.json();

      if (data.success) {
        setSuggestions(data.suggestions);
        toast.success(`${data.suggestions.length} clips sugeridos!`);
      } else {
        toast.error("Erro ao gerar sugestoes");
      }
    } catch (error) {
      console.error("Error generating suggestions:", error);
      toast.error("Erro ao gerar sugestoes");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveAndExportClip = async (suggestion: ClipSuggestion) => {
    try {
      // First save the clip
      const saveResponse = await fetch(`/api/projects/${projectId}/clips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: 1,
          save: true,
        }),
      });

      const saveData = await saveResponse.json();

      if (saveData.success && saveData.savedClips && saveData.savedClips[0]) {
        const clip = saveData.savedClips[0];
        setSavedClips((prev) => [...prev, clip]);

        // Now export the clip
        await exportClip(clip.id);
      }
    } catch (error) {
      console.error("Error saving clip:", error);
      toast.error("Erro ao salvar clip");
    }
  };

  const exportClip = async (clipId: string) => {
    setIsExporting(clipId);
    try {
      const response = await fetch(`/api/clips/${clipId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: selectedFormat,
          addCaptions,
          captionStyle,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update clip in state
        setSavedClips((prev) =>
          prev.map((c) =>
            c.id === clipId
              ? { ...c, status: "ready", clipUrl: data.clipUrl }
              : c
          )
        );
        toast.success("Clip exportado!");
      } else {
        toast.error(data.error || "Erro ao exportar clip");
      }
    } catch (error) {
      console.error("Error exporting clip:", error);
      toast.error("Erro ao exportar clip");
    } finally {
      setIsExporting(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-emerald-400";
    if (score >= 6) return "text-amber-400";
    return "text-zinc-400";
  };

  const formatIcons = {
    "9:16": <Smartphone className="h-4 w-4" />,
    "1:1": <Square className="h-4 w-4" />,
    "16:9": <Monitor className="h-4 w-4" />,
  };

  return (
    <div className={cn("flex flex-col h-full bg-zinc-900", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-pink-400" />
          <h3 className="font-semibold text-white">Clips Sociais</h3>
        </div>
        <Button
          size="sm"
          onClick={generateSuggestions}
          disabled={isGenerating}
          className="bg-pink-500 hover:bg-pink-400"
        >
          {isGenerating ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Gerar
        </Button>
      </div>

      {/* Format & Caption Settings */}
      <div className="p-4 border-b border-zinc-800 space-y-3">
        {/* Format Selection */}
        <div>
          <p className="text-xs text-zinc-500 mb-2">Formato</p>
          <div className="flex gap-2">
            {(["9:16", "1:1", "16:9"] as const).map((format) => (
              <button
                key={format}
                onClick={() => setSelectedFormat(format)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors",
                  selectedFormat === format
                    ? "bg-pink-500 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                )}
              >
                {formatIcons[format]}
                <span className="text-xs">{format}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Captions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-zinc-400" />
            <span className="text-sm text-white">Legendas</span>
          </div>
          <Switch checked={addCaptions} onCheckedChange={setAddCaptions} />
        </div>

        {addCaptions && (
          <div className="flex gap-2 ml-6">
            <button
              onClick={() => setCaptionStyle("animated")}
              className={cn(
                "flex-1 py-1.5 text-xs rounded-lg transition-colors",
                captionStyle === "animated"
                  ? "bg-pink-500 text-white"
                  : "bg-zinc-800 text-zinc-400"
              )}
            >
              Animadas (TikTok)
            </button>
            <button
              onClick={() => setCaptionStyle("static")}
              className={cn(
                "flex-1 py-1.5 text-xs rounded-lg transition-colors",
                captionStyle === "static"
                  ? "bg-pink-500 text-white"
                  : "bg-zinc-800 text-zinc-400"
              )}
            >
              Estaticas
            </button>
          </div>
        )}
      </div>

      {/* Clips List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Saved Clips */}
        {savedClips.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-zinc-500 mb-2">Clips Salvos</p>
            {savedClips.map((clip) => (
              <div
                key={clip.id}
                className="bg-zinc-800 rounded-lg p-3 mb-2"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-white truncate">
                    {clip.title}
                  </h4>
                  {clip.status === "ready" && clip.clipUrl && (
                    <a
                      href={clip.clipUrl}
                      download
                      className="p-1.5 bg-emerald-500 rounded-lg text-white"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {clip.duration}s
                  </span>
                  <span className={getScoreColor(clip.viralPotential)}>
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                    {clip.viralPotential}/10
                  </span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs",
                      clip.status === "ready"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : clip.status === "processing"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-zinc-700 text-zinc-400"
                    )}
                  >
                    {clip.status === "ready"
                      ? "Pronto"
                      : clip.status === "processing"
                      ? "Processando..."
                      : "Pendente"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <>
            <p className="text-xs text-zinc-500">Sugestoes</p>
            <AnimatePresence>
              {suggestions.map((suggestion, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700"
                >
                  {/* Title & Scores */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white mb-1">
                        {suggestion.title}
                      </h4>
                      <p className="text-xs text-zinc-400 line-clamp-2">
                        {suggestion.description}
                      </p>
                    </div>
                  </div>

                  {/* Hook Preview */}
                  <div className="bg-zinc-900 rounded-lg p-2 mb-3">
                    <p className="text-xs text-zinc-500 mb-1">Hook:</p>
                    <p className="text-sm text-white italic">
                      "{suggestion.hookText}..."
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-zinc-500" />
                      <span className="text-xs text-zinc-400">
                        {formatTime(suggestion.startTime)} -{" "}
                        {formatTime(suggestion.endTime)}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        getScoreColor(suggestion.hookScore)
                      )}
                    >
                      <Sparkles className="h-3 w-3" />
                      <span className="text-xs">Hook: {suggestion.hookScore}/10</span>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        getScoreColor(suggestion.viralPotential)
                      )}
                    >
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-xs">Viral: {suggestion.viralPotential}/10</span>
                    </div>
                  </div>

                  {/* Reason */}
                  <p className="text-xs text-zinc-500 mb-3">{suggestion.reason}</p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPlaySegment?.(suggestion.startTime)}
                      className="border-zinc-700"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveAndExportClip(suggestion)}
                      className="flex-1 bg-pink-500 hover:bg-pink-400"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Exportar Clip
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}

        {suggestions.length === 0 && savedClips.length === 0 && (
          <div className="text-center py-8">
            <Scissors className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              Nenhum clip gerado ainda.
            </p>
            <p className="text-zinc-600 text-xs mt-1">
              Clique em "Gerar" para identificar melhores momentos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
