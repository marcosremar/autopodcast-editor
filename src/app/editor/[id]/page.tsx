"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { Project, Segment } from "@/lib/db/schema";
import { ChatEditor } from "@/components/editor/ChatEditor";
import { AdvancedTimeline, AdvancedTimelineRef, PreviewRange } from "@/components/editor/AdvancedTimeline";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

export default function EditorPage({ params }: EditorPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const timelineRef = useRef<AdvancedTimelineRef>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewRange, setPreviewRange] = useState<PreviewRange | undefined>(undefined);

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

  // Handler para selecionar/deselecionar multiplos segmentos (range selection)
  const handleSelectRange = (segmentIds: string[], select: boolean) => {
    setSegments((prev) =>
      prev.map((seg) =>
        segmentIds.includes(seg.id) ? { ...seg, isSelected: select } : seg
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
        // Ativar preview para mostrar os segmentos sendo selecionados
        setPreviewRange({
          segmentIds: action.segmentIds,
          label: action.message || `${action.segmentIds.length} segmentos`,
        });
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
        // Ativar preview mode para mostrar os segmentos mencionados
        setPreviewRange({
          segmentIds: action.segmentIds,
          label: action.message || `${action.segmentIds.length} segmentos`,
        });
        // Play the first segment using timeline
        const firstSegmentId = action.segmentIds[0];
        const segment = segments.find(s => s.id === firstSegmentId);
        if (segment && timelineRef.current) {
          timelineRef.current.playSegment(segment);
        }
        break;
    }
  };

  // Handler para fechar preview
  const handlePreviewClose = () => {
    setPreviewRange(undefined);
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

      {/* Main Content - Timeline + Chat unified */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* Timeline Section */}
        <div className="shrink-0 border-b border-zinc-800">
          <AdvancedTimeline
            ref={timelineRef}
            segments={segments}
            audioUrl={project.originalAudioUrl}
            onToggleSelect={handleToggleSelect}
            onSelectRange={handleSelectRange}
            previewRange={previewRange}
            onPreviewClose={handlePreviewClose}
            className="rounded-none border-0"
          />
        </div>

        {/* Chat Section */}
        <div className="flex-1 min-h-0">
          <ChatEditor
            projectId={project.id}
            segments={segments}
            onAction={handleChatAction}
            onPlaySegment={(segment) => timelineRef.current?.playSegment(segment)}
            onSetPreview={(segmentIds, label) => {
              setPreviewRange({
                segmentIds,
                label,
              });
            }}
          />
        </div>
      </main>
    </div>
  );
}
