"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { Project, Segment } from "@/lib/db/schema";
import { toast } from "sonner";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { EditorChat } from "@/components/editor/EditorChat";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { AdvancedTimeline, AdvancedTimelineRef, PreviewRange } from "@/components/editor/AdvancedTimeline";
import { ExportButton } from "@/components/editor/ExportButton";
import { FillerWordPanel } from "@/components/editor/FillerWordPanel";
import { AudioEnhancementPanel } from "@/components/editor/AudioEnhancementPanel";
import { SocialClipsGenerator } from "@/components/editor/SocialClipsGenerator";
import { ShowNotesPanel } from "@/components/editor/ShowNotesPanel";
import { TranscriptEditor } from "@/components/editor/TranscriptEditor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Sparkles,
  Save,
  Keyboard,
  LayoutTemplate,
  MessageSquare,
  FileText,
  Wand2,
  Scissors,
  Volume2,
  Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarPanel = "chat" | "transcript" | "fillers" | "enhance" | "clips" | "notes";

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
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [activePanel, setActivePanel] = useState<SidebarPanel>("chat");
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | undefined>(undefined);

  // Fetch user ID for chat persistence
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          if (data.user?.id) {
            setUserId(data.user.id);
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
  }, []);

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

        const response = await fetch(`/api/projects/${resolvedParams.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedSegments: selectedSegmentIds,
            segmentOrder,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save changes");
        }
      } catch (err) {
        console.error("Error saving changes:", err);
        toast.error("Erro ao salvar", {
          description: "Não foi possível salvar as alterações. Tentaremos novamente.",
        });
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
    console.log("[Editor] Chat action received:", action);

    if (!action.segmentIds || action.segmentIds.length === 0) {
      console.log("[Editor] No segmentIds, skipping action");
      if (action.type === "focus") {
        // Focus sem segmentIds - scroll para o topo
        return;
      }
      return;
    }

    switch (action.type) {
      case "select":
        console.log("[Editor] Selecting segments:", action.segmentIds);
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
        console.log("[Editor] Deselecting segments:", action.segmentIds);
        setSegments((prev) =>
          prev.map((seg) =>
            action.segmentIds!.includes(seg.id)
              ? { ...seg, isSelected: false }
              : seg
          )
        );
        break;
      case "focus":
        console.log("[Editor] Focusing on segments:", action.segmentIds);
        // Ativar preview mode para mostrar os segmentos mencionados
        setPreviewRange({
          segmentIds: action.segmentIds,
          label: action.message || `${action.segmentIds.length} segmentos`,
        });
        // Play the first segment using timeline
        const firstSegmentId = action.segmentIds[0];
        const segment = segments.find(s => s.id === firstSegmentId);
        if (segment && timelineRef.current) {
          console.log("[Editor] Playing first segment:", segment.id);
          timelineRef.current.playSegment(segment);
        } else {
          console.log("[Editor] Could not play segment - segment or ref not found");
        }
        break;
      default:
        console.log("[Editor] Unknown action type:", action.type);
    }
  };

  // Handler para fechar preview
  const handlePreviewClose = () => {
    setPreviewRange(undefined);
  };

  // Handler para buscar tempo especifico no audio
  const handleSeekTo = (time: number) => {
    if (timelineRef.current) {
      timelineRef.current.seekTo(time);
      setCurrentTime(time);
    }
  };

  // Handler para selecionar segmento na transcricao
  const handleSelectSegment = (segmentId: string) => {
    setSegments((prev) =>
      prev.map((seg) =>
        seg.id === segmentId ? { ...seg, isSelected: !seg.isSelected } : seg
      )
    );
  };

  // Handler para audio melhorado
  const handleAudioEnhanced = (enhancedUrl: string) => {
    if (project) {
      setProject({ ...project, enhancedAudioUrl: enhancedUrl });
      toast.success("Audio melhorado aplicado!");
    }
  };

  // Handler para atualizar tempo atual
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
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

  // Keyboard shortcuts
  const handleSelectAll = () => {
    setSegments((prev) => prev.map((seg) => ({ ...seg, isSelected: true })));
    toast.success("Todos os segmentos selecionados");
  };

  const handleDeselectAll = () => {
    setSegments((prev) => prev.map((seg) => ({ ...seg, isSelected: false })));
    toast.success("Todos os segmentos desmarcados");
  };

  useKeyboardShortcuts([
    {
      key: 'a',
      ctrl: true,
      description: 'Selecionar todos',
      action: handleSelectAll,
    },
    {
      key: 'a',
      ctrl: true,
      shift: true,
      description: 'Desmarcar todos',
      action: handleDeselectAll,
    },
    {
      key: '?',
      shift: true,
      description: 'Mostrar atalhos',
      action: () => setShowShortcuts(true),
    },
  ], !isLoading && !!project);

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

  // Calculate durations
  const originalDuration = project.originalDuration || 0;
  const selectedDuration = segments
    .filter((s) => s.isSelected)
    .reduce((sum, seg) => sum + (seg.endTime - seg.startTime), 0);
  const timeSaved = originalDuration - selectedDuration;
  const reductionPercentage = originalDuration > 0
    ? Math.round((timeSaved / originalDuration) * 100)
    : 0;

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
                    <>
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                        <Clock className="h-3 w-3" />
                        {formatDuration(originalDuration)} original
                      </span>
                      {selectedCount > 0 && (
                        <>
                          <span className="text-xs text-zinc-700">→</span>
                          <span className="inline-flex items-center gap-1 text-xs text-blue-400 font-medium">
                            {formatDuration(selectedDuration)} editado
                          </span>
                          {timeSaved > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                              ({reductionPercentage}% reduzido)
                            </span>
                          )}
                        </>
                      )}
                    </>
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
                onClick={() => router.push(`/editor/${resolvedParams.id}/template`)}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                title="Configurar template e mapeamento de seções"
              >
                <LayoutTemplate className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Mapeamento</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShortcuts(true)}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <Keyboard className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Atalhos</span>
              </Button>
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

      {/* Main Content - Timeline + Sidebar */}
      <main className="flex-1 min-h-0 overflow-hidden flex">
        {/* Left Content - Timeline */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Timeline Section */}
          <div className="shrink-0 border-b border-zinc-800">
            <AdvancedTimeline
              ref={timelineRef}
              segments={segments}
              audioUrl={project.enhancedAudioUrl || project.originalAudioUrl}
              onToggleSelect={handleToggleSelect}
              onSelectRange={handleSelectRange}
              previewRange={previewRange}
              onPreviewClose={handlePreviewClose}
              onTimeUpdate={handleTimeUpdate}
              className="rounded-none border-0"
            />
          </div>

          {/* Canvas Area - when transcript is NOT active */}
          {activePanel !== "transcript" && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <EditorCanvas
                segments={segments}
                sections={(() => {
                  // Generate demo sections based on segments
                  if (segments.length === 0) return undefined;

                  const totalSegments = segments.length;
                  const introEnd = Math.ceil(totalSegments * 0.15);
                  const devEnd = Math.ceil(totalSegments * 0.75);

                  return [
                    {
                      section: {
                        id: "demo-intro",
                        projectId: project.id,
                        name: "Introducao",
                        order: 1,
                        status: "approved",
                        templateSectionId: null,
                        targetDuration: null,
                        actualDuration: null,
                        notes: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      },
                      segments: segments.slice(0, introEnd),
                    },
                    {
                      section: {
                        id: "demo-dev",
                        projectId: project.id,
                        name: "Desenvolvimento",
                        order: 2,
                        status: "review",
                        templateSectionId: null,
                        targetDuration: null,
                        actualDuration: null,
                        notes: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      },
                      segments: segments.slice(introEnd, devEnd),
                    },
                    {
                      section: {
                        id: "demo-conclusion",
                        projectId: project.id,
                        name: "Conclusao",
                        order: 3,
                        status: "pending",
                        templateSectionId: null,
                        targetDuration: null,
                        actualDuration: null,
                        notes: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      },
                      segments: segments.slice(devEnd),
                    },
                  ];
                })()}
                selectedSegmentId={selectedSegmentId}
                currentTime={currentTime}
                onSeekTo={handleSeekTo}
                onSelectSegment={(id) => setSelectedSegmentId(id)}
                projectTitle={project.title}
                originalDuration={project.originalDuration || 0}
                className="h-full"
              />
            </div>
          )}

          {/* Transcript Editor - when transcript is active */}
          {activePanel === "transcript" && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <TranscriptEditor
                segments={segments}
                currentTime={currentTime}
                onSeekTo={handleSeekTo}
                onSelectSegment={handleSelectSegment}
                className="h-full"
              />
            </div>
          )}
        </div>

        {/* Right Sidebar - Tools */}
        <div className="w-96 border-l border-zinc-800 flex flex-col shrink-0 bg-zinc-900/50">
          {/* Sidebar Tabs */}
          <div className="flex border-b border-zinc-800 shrink-0 overflow-x-auto">
            <button
              onClick={() => setActivePanel("chat")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap",
                activePanel === "chat"
                  ? "text-emerald-400 border-b-2 border-emerald-400"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat
            </button>
            <button
              onClick={() => setActivePanel("transcript")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap",
                activePanel === "transcript"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              Transcricao
            </button>
            <button
              onClick={() => setActivePanel("fillers")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap",
                activePanel === "fillers"
                  ? "text-red-400 border-b-2 border-red-400"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Mic className="h-3.5 w-3.5" />
              Fillers
            </button>
            <button
              onClick={() => setActivePanel("enhance")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap",
                activePanel === "enhance"
                  ? "text-purple-400 border-b-2 border-purple-400"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Wand2 className="h-3.5 w-3.5" />
              Audio
            </button>
            <button
              onClick={() => setActivePanel("clips")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap",
                activePanel === "clips"
                  ? "text-pink-400 border-b-2 border-pink-400"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Scissors className="h-3.5 w-3.5" />
              Clips
            </button>
            <button
              onClick={() => setActivePanel("notes")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap",
                activePanel === "notes"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              Notes
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activePanel === "fillers" && (
              <FillerWordPanel
                projectId={project.id}
                onPlayTime={handleSeekTo}
                className="h-full"
              />
            )}

            {activePanel === "enhance" && (
              <AudioEnhancementPanel
                projectId={project.id}
                onEnhanced={handleAudioEnhanced}
                className="h-full"
              />
            )}

            {activePanel === "clips" && (
              <SocialClipsGenerator
                projectId={project.id}
                onPlaySegment={handleSeekTo}
                className="h-full"
              />
            )}

            {activePanel === "notes" && (
              <ShowNotesPanel
                projectId={project.id}
                onSeekTo={handleSeekTo}
                className="h-full"
              />
            )}

            {/* Chat in sidebar */}
            {activePanel === "chat" && userId && (
              <EditorChat
                projectId={project.id}
                userId={userId}
                onAction={handleChatAction}
                isOpen={true}
                onToggle={() => {}}
                inline={true}
              />
            )}

            {/* Transcript placeholder */}
            {activePanel === "transcript" && (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-blue-400" />
                </div>
                <p className="text-sm text-zinc-400">
                  A transcricao esta ativa na area principal
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Keyboard Shortcuts Help Dialog */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Keyboard className="h-5 w-5 text-emerald-400" />
              Atalhos de Teclado
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Use esses atalhos para trabalhar mais rapido no editor
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Seleção */}
            <div>
              <h3 className="text-sm font-semibold text-emerald-400 mb-2">Seleção</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-800/50">
                  <span className="text-sm text-zinc-300">Selecionar todos os segmentos</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-zinc-900 bg-zinc-300 rounded">
                    Ctrl + A
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-800/50">
                  <span className="text-sm text-zinc-300">Desmarcar todos os segmentos</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-zinc-900 bg-zinc-300 rounded">
                    Ctrl + Shift + A
                  </kbd>
                </div>
              </div>
            </div>

            {/* Ajuda */}
            <div>
              <h3 className="text-sm font-semibold text-blue-400 mb-2">Ajuda</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-800/50">
                  <span className="text-sm text-zinc-300">Mostrar/ocultar atalhos</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-zinc-900 bg-zinc-300 rounded">
                    Shift + ?
                  </kbd>
                </div>
              </div>
            </div>

            {/* Dicas */}
            <div className="mt-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-emerald-400">
                <strong>Dica:</strong> Use Ctrl+A para selecionar tudo rapidamente, depois desmarque apenas os segmentos que não quer incluir no export final.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
