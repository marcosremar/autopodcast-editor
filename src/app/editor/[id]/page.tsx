"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Project, Segment } from "@/lib/db/schema";
import { CompactPlayer, CompactPlayerRef } from "@/components/editor/CompactPlayer";
import { ChatEditor } from "@/components/editor/ChatEditor";
import { ExportButton } from "@/components/editor/ExportButton";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Sparkles,
  Save,
  LayoutGrid,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

type ViewMode = "chat" | "timeline";

export default function EditorPage({ params }: EditorPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const playerRef = useRef<CompactPlayerRef>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("chat");

  // Fetch project and segments
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/projects/${resolvedParams.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch project");
        }

        const data = await response.json();
        setProject(data.project);
        setSegments(data.segments);
      } catch (err) {
        console.error("Error fetching project:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load project"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [resolvedParams.id]);

  // Auto-save when segments change
  useEffect(() => {
    if (!project || segments.length === 0 || isLoading) return;

    const saveChanges = async () => {
      setIsSaving(true);
      try {
        const selectedSegmentIds = segments
          .filter((s) => s.isSelected)
          .map((s) => s.id);

        const segmentOrder = segments
          .filter((s) => s.isSelected)
          .map((s, index) => ({
            segmentId: s.id,
            order: index,
          }));

        await fetch(`/api/projects/${resolvedParams.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedSegments: selectedSegmentIds,
            segmentOrder,
          }),
        });
      } catch (err) {
        console.error("Error saving changes:", err);
      } finally {
        setIsSaving(false);
      }
    };

    const debounce = setTimeout(saveChanges, 1000);
    return () => clearTimeout(debounce);
  }, [segments, project, resolvedParams.id, isLoading]);

  const handleToggleSelect = (segmentId: string) => {
    setSegments((prev) =>
      prev.map((seg) =>
        seg.id === segmentId ? { ...seg, isSelected: !seg.isSelected } : seg
      )
    );
  };

  // Handler para acoes do chat
  const handleChatAction = (action: { type: string; segmentIds?: string[]; message: string }) => {
    if (!action.segmentIds || action.segmentIds.length === 0) {
      if (action.type === "focus") {
        // Focus sem segmentIds - scroll para o topo
        return;
      }
      return;
    }

    switch (action.type) {
      case "select":
        setSegments((prev) =>
          prev.map((seg) =>
            action.segmentIds!.includes(seg.id)
              ? { ...seg, isSelected: true }
              : seg
          )
        );
        break;
      case "deselect":
        setSegments((prev) =>
          prev.map((seg) =>
            action.segmentIds!.includes(seg.id)
              ? { ...seg, isSelected: false }
              : seg
          )
        );
        break;
      case "focus":
        // Play the first segment
        const firstSegmentId = action.segmentIds[0];
        const segment = segments.find(s => s.id === firstSegmentId);
        if (segment && playerRef.current) {
          playerRef.current.playSegment(segment);
        }
        break;
    }
  };

  const handleReprocess = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/process/${resolvedParams.id}`, {
        method: "POST",
      });
      if (response.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error("Error reprocessing:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-zinc-800 border-t-emerald-500 animate-spin mx-auto" />
            <Sparkles className="h-6 w-6 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-6 text-zinc-400">Carregando projeto...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="max-w-md text-center">
          <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-white">
            Erro ao carregar projeto
          </h2>
          <p className="mt-2 text-zinc-400">{error || "Projeto nao encontrado"}</p>
          <Button
            className="mt-6 bg-zinc-800 hover:bg-zinc-700 text-white"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const selectedCount = segments.filter((s) => s.isSelected).length;

  // Show processing state if no segments yet
  if (segments.length === 0 && project.status !== "completed") {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>

          <div className="text-center py-20">
            <div className="relative inline-block">
              <div className="h-20 w-20 rounded-full border-4 border-zinc-800 border-t-emerald-500 animate-spin" />
              <Sparkles className="h-8 w-8 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <h2 className="mt-8 text-2xl font-bold text-white">
              Processando Podcast
            </h2>
            <p className="mt-3 text-zinc-400 max-w-md mx-auto">
              Estamos transcrevendo e analisando seu audio com IA.
              Isso pode levar alguns minutos dependendo do tamanho do arquivo.
            </p>
            <div className="mt-8">
              <span className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
                project.status === "transcribing" && "bg-blue-500/10 text-blue-400",
                project.status === "analyzing" && "bg-purple-500/10 text-purple-400",
                project.status === "failed" && "bg-red-500/10 text-red-400"
              )}>
                <Loader2 className="h-4 w-4 animate-spin" />
                {project.status === "transcribing" && "Transcrevendo audio..."}
                {project.status === "analyzing" && "Analisando segmentos..."}
                {project.status === "failed" && "Falha no processamento"}
                {!["transcribing", "analyzing", "failed"].includes(project.status || "") && "Processando..."}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl shrink-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div>
                <h1 className="text-lg font-bold text-white">
                  {project.title || "Podcast sem titulo"}
                </h1>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Pronto
                  </span>
                  {project.originalDuration && (
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" />
                      {formatDuration(project.originalDuration)}
                    </span>
                  )}
                  {isSaving && (
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                      <Save className="h-3 w-3 animate-pulse" />
                      Salvando...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-zinc-800 rounded-lg p-1 mr-2">
                <button
                  onClick={() => setViewMode("chat")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    viewMode === "chat"
                      ? "bg-emerald-500 text-white"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Chat
                </button>
                <button
                  onClick={() => setViewMode("timeline")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    viewMode === "timeline"
                      ? "bg-emerald-500 text-white"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Timeline
                </button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleReprocess}
                disabled={isProcessing}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Reprocessar</span>
              </Button>
              <ExportButton
                projectId={project.id}
                selectedSegmentsCount={selectedCount}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Compact Player - Always visible at top */}
      <div className="shrink-0 px-4 py-3 border-b border-zinc-800">
        <CompactPlayer
          ref={playerRef}
          segments={segments}
          audioUrl={project.originalAudioUrl}
          onToggleSelect={handleToggleSelect}
        />
      </div>

      {/* Main Content - Chat or Timeline based on viewMode */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {viewMode === "chat" ? (
          <ChatEditor
            projectId={project.id}
            segments={segments}
            onAction={handleChatAction}
            onPlaySegment={(segment) => playerRef.current?.playSegment(segment)}
          />
        ) : (
          <div className="h-full overflow-auto p-4">
            {/* Timeline View - Import the old HorizontalTimeline for this */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <TimelineView
                segments={segments}
                onToggleSelect={handleToggleSelect}
                onPlaySegment={(segment) => playerRef.current?.playSegment(segment)}
              />
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}

// Timeline View Component (simplified from HorizontalTimeline)
function TimelineView({
  segments,
  onToggleSelect,
  onPlaySegment,
}: {
  segments: Segment[];
  onToggleSelect: (segmentId: string) => void;
  onPlaySegment: (segment: Segment) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  type FilterType = "selected" | "good" | "tangent" | "repetition" | "error" | "low-interest";
  const filterOptions: { key: FilterType; label: string; color: string; bgColor: string }[] = [
    { key: "selected", label: "Selecionados", color: "text-emerald-400", bgColor: "bg-emerald-500" },
    { key: "good", label: "Bons", color: "text-blue-400", bgColor: "bg-blue-500" },
    { key: "tangent", label: "Tangentes", color: "text-amber-400", bgColor: "bg-amber-500" },
    { key: "repetition", label: "Repeticoes", color: "text-yellow-400", bgColor: "bg-yellow-500" },
    { key: "error", label: "Erros", color: "text-red-400", bgColor: "bg-red-500" },
    { key: "low-interest", label: "Baixo Interesse", color: "text-zinc-400", bgColor: "bg-zinc-600" },
  ];

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const getSegmentStatus = (segment: Segment) => {
    const analysis = segment.analysis as any;
    if (analysis?.isTangent) return "tangent";
    if (analysis?.isRepetition) return "repetition";
    if (analysis?.hasFactualError || analysis?.hasContradiction) return "error";
    if ((segment.interestScore || 0) < 5) return "low-interest";
    return "good";
  };

  const getStatusLabel = (segment: Segment) => {
    const analysis = segment.analysis as any;
    if (analysis?.isTangent) return "Tangente";
    if (analysis?.isRepetition) return "Repetido";
    if (analysis?.hasFactualError) return "Erro factual";
    if (analysis?.hasContradiction) return "Contradiz";
    if ((segment.interestScore || 0) < 5) return "Baixo interesse";
    return "OK";
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800">
      {/* Search and Filters */}
      <div className="p-4 border-b border-zinc-800">
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Buscar por texto, topico..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {filterOptions.map((filter) => {
            const isActive = activeFilters.includes(filter.key);
            const count = segments.filter(s => {
              if (filter.key === "selected") return s.isSelected;
              return getSegmentStatus(s) === filter.key;
            }).length;

            return (
              <button
                key={filter.key}
                onClick={() => toggleFilter(filter.key)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  isActive
                    ? `${filter.bgColor} text-white`
                    : `bg-zinc-800 ${filter.color} hover:bg-zinc-700`
                )}
              >
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  isActive ? "bg-white" : filter.bgColor
                )} />
                {filter.label}
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px]",
                  isActive ? "bg-white/20" : "bg-zinc-700"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Segment List */}
      <div className="max-h-[500px] overflow-y-auto">
        {segments
          .filter((segment) => {
            if (searchQuery) {
              const query = searchQuery.toLowerCase();
              const matchesText = segment.text.toLowerCase().includes(query);
              const matchesTopic = (segment.topic || "").toLowerCase().includes(query);
              if (!matchesText && !matchesTopic) return false;
            }

            if (activeFilters.length > 0) {
              const segmentStatus = segment.isSelected ? "selected" : getSegmentStatus(segment);
              if (!activeFilters.includes(segmentStatus) && !(segment.isSelected && activeFilters.includes("selected"))) {
                return false;
              }
            }

            return true;
          })
          .map((segment) => {
            const isSelected = segment.isSelected;
            const status = getSegmentStatus(segment);

            return (
              <div
                key={segment.id}
                className={cn(
                  "flex items-center gap-4 p-4 border-b border-zinc-800/50 cursor-pointer transition-colors group",
                  isSelected
                    ? "bg-emerald-500/10 hover:bg-emerald-500/15"
                    : "hover:bg-zinc-800"
                )}
                onClick={() => onPlaySegment(segment)}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(segment.id);
                  }}
                  className={cn(
                    "h-6 w-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                    isSelected
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-zinc-600 hover:border-emerald-500"
                  )}
                >
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-white" />}
                </button>

                {/* Time */}
                <div className="w-20 shrink-0">
                  <div className="text-sm font-mono text-white">
                    {formatTime(segment.startTime)}
                  </div>
                  <div className="text-xs text-zinc-600 font-mono">
                    {formatTime(segment.endTime - segment.startTime)}
                  </div>
                </div>

                {/* Topic & Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "text-sm font-medium",
                      isSelected ? "text-emerald-400" : "text-white"
                    )}>
                      {segment.topic || "Sem topico"}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      isSelected && "bg-emerald-500/20 text-emerald-400",
                      !isSelected && status === "error" && "bg-red-500/20 text-red-400",
                      !isSelected && status === "tangent" && "bg-amber-500/20 text-amber-400",
                      !isSelected && status === "repetition" && "bg-yellow-500/20 text-yellow-400",
                      !isSelected && status === "low-interest" && "bg-zinc-700 text-zinc-400",
                      !isSelected && status === "good" && "bg-blue-500/20 text-blue-400"
                    )}>
                      {isSelected ? "Selecionado" : getStatusLabel(segment)}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500 truncate">
                    {segment.text}
                  </p>
                </div>

                {/* Score */}
                {segment.interestScore !== null && (
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                    (segment.interestScore || 0) >= 7
                      ? "bg-emerald-500/20 text-emerald-400"
                      : (segment.interestScore || 0) >= 5
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-red-500/20 text-red-400"
                  )}>
                    {segment.interestScore}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
