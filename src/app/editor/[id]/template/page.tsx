"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Loader2,
  Download,
  CheckCircle2,
  Play,
  Pause,
  LayoutTemplate,
  Mic,
  Clock,
  MessageSquare,
  X,
  Zap,
  FileAudio,
  AlertCircle,
  ChevronDown,
  Layers,
  Check,
  Sparkles,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InlineRecordingModal } from "@/components/recording/InlineRecordingModal";
import { EditorChat } from "@/components/editor/EditorChat";

interface TemplatePageProps {
  params: Promise<{ id: string }>;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  targetDuration: number | null;
  sections: TemplateSection[];
}

interface TemplateSection {
  id: string;
  name: string;
  type: string;
  description: string | null;
  minDuration: number | null;
  maxDuration: number | null;
  suggestedDuration: number | null;
  isRequired: boolean;
  order: number;
  exampleText: string | null;
}

interface MappedSegment {
  id: string;
  title: string | null;
  summary: string | null;
  startTime: number;
  endTime: number;
  duration: number;
  confidence: number;
  sectionId: string;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const sectionColors: Record<string, { bg: string; text: string; border: string }> = {
  hook: { bg: "bg-violet-500/20", text: "text-violet-400", border: "border-violet-500/30" },
  intro: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  context: { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/30" },
  main_content: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
  example: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
  recap: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
  cta: { bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/30" },
  outro: { bg: "bg-indigo-500/20", text: "text-indigo-400", border: "border-indigo-500/30" },
};

function getColorForType(type: string) {
  return sectionColors[type] || { bg: "bg-zinc-500/20", text: "text-zinc-400", border: "border-zinc-500/30" };
}

export default function TemplatePage({ params }: TemplatePageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [organizingStep, setOrganizingStep] = useState(0);
  const [organizingTotal, setOrganizingTotal] = useState(0);
  const [currentOrganizingSection, setCurrentOrganizingSection] = useState<string | null>(null);

  const [project, setProject] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [segments, setSegments] = useState<MappedSegment[]>([]);
  const [playingSegmentId, setPlayingSegmentId] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [focusedSectionId, setFocusedSectionId] = useState<string | null>(null);

  const [recordingModal, setRecordingModal] = useState<{
    isOpen: boolean;
    sectionId: string;
    sectionName: string;
    targetDuration: number;
    exampleText?: string;
  }>({
    isOpen: false,
    sectionId: "",
    sectionName: "",
    targetDuration: 60,
  });

  useEffect(() => {
    loadData();
  }, [resolvedParams.id]);

  async function loadData() {
    try {
      setIsLoading(true);

      const projectResponse = await fetch(`/api/projects/${resolvedParams.id}`);
      const projectData = await projectResponse.json();

      if (!projectData.project) {
        throw new Error("Project not found");
      }

      setProject(projectData.project);
      setAudioUrl(projectData.project.audioUrl);

      const templatesResponse = await fetch("/api/templates");
      const templatesData = await templatesResponse.json();

      if (templatesData.success) {
        setTemplates(templatesData.templates || []);
      }

      if (projectData.project.currentTemplateId) {
        setSelectedTemplateId(projectData.project.currentTemplateId);
        await loadMapping();
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMapping() {
    try {
      const response = await fetch(`/api/projects/${resolvedParams.id}/auto-map`);
      const data = await response.json();

      if (data.success) {
        if (data.sections) {
          setSections(data.sections);
        }

        if (data.mappings && data.mappings.length > 0) {
          const allSegments: MappedSegment[] = data.mappings.map((m: any) => ({
            id: m.segmentId,
            title: m.segmentTitle,
            summary: m.segmentSummary,
            startTime: m.startTime || 0,
            endTime: m.endTime || 0,
            duration: (m.endTime || 0) - (m.startTime || 0),
            confidence: m.confidence,
            sectionId: m.sectionId,
          }));
          setSegments(allSegments);
        }
      }
    } catch (error) {
      console.error("Error loading mapping:", error);
    }
  }

  async function handleSelectTemplate(template: Template) {
    if (template.id === selectedTemplateId) {
      setShowTemplateSelector(false);
      return;
    }

    setIsOrganizing(true);
    setOrganizingStep(0);
    setSegments([]);
    setShowTemplateSelector(false);

    if (template.sections) {
      setSections(template.sections);
      setOrganizingTotal(template.sections.length);
    }

    try {
      const selectResponse = await fetch(
        `/api/projects/${resolvedParams.id}/select-template`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: template.id }),
        }
      );

      const selectData = await selectResponse.json();
      if (!selectData.success) {
        throw new Error(selectData.error);
      }

      setSelectedTemplateId(template.id);

      const organizePromise = fetch(
        `/api/projects/${resolvedParams.id}/auto-map`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ save: true }),
        }
      ).then(res => res.json());

      for (let i = 0; i < (template.sections?.length || 0); i++) {
        const section = template.sections?.[i];
        if (section) {
          setCurrentOrganizingSection(section.name);
          setOrganizingStep(i + 1);
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const mapData = await organizePromise;

      if (mapData.success) {
        await loadMapping();
        toast.success("Template aplicado!");
      }
    } catch (error: any) {
      console.error("Error selecting template:", error);
      toast.error("Erro ao aplicar template");
    } finally {
      setIsOrganizing(false);
      setCurrentOrganizingSection(null);
    }
  }

  function playSegment(segment: MappedSegment) {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (playingSegmentId === segment.id) {
      audio.pause();
      setPlayingSegmentId(null);
      return;
    }

    audio.currentTime = segment.startTime;
    audio.play();
    setPlayingSegmentId(segment.id);

    const checkEnd = () => {
      if (audio.currentTime >= segment.endTime) {
        audio.pause();
        setPlayingSegmentId(null);
        audio.removeEventListener("timeupdate", checkEnd);
      }
    };
    audio.addEventListener("timeupdate", checkEnd);
  }

  function handleRecordSection(section: TemplateSection) {
    const suggestedDuration = section.suggestedDuration || section.minDuration || 60;
    const sectionSegs = segments.filter((s) => s.sectionId === section.id);
    const currentDuration = sectionSegs.reduce((sum, s) => sum + s.duration, 0);
    const missingDuration = Math.max(0, suggestedDuration - currentDuration);

    setRecordingModal({
      isOpen: true,
      sectionId: section.id,
      sectionName: section.name,
      targetDuration: missingDuration,
      exampleText: section.exampleText || undefined,
    });
  }

  async function handleRecordingComplete(audioBlob: Blob, duration: number) {
    toast.success("Gravacao salva!");
    setRecordingModal((prev) => ({ ...prev, isOpen: false }));
    setTimeout(() => loadMapping(), 2000);
  }

  function handleExport() {
    router.push(`/api/export/${resolvedParams.id}?template=true`);
  }

  function handleChatAction(action: any) {
    if (action.type === "focus" && action.sectionId) {
      setFocusedSectionId(action.sectionId);
    } else if (action.type === "record_section" && action.sectionId) {
      const section = sections.find(s => s.id === action.sectionId);
      if (section) handleRecordSection(section);
    } else if (action.type === "auto_map") {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) handleSelectTemplate(template);
    } else if (action.type === "export") {
      handleExport();
    }
  }

  const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const requiredSections = sections.filter((s) => s.isRequired);
  const completedSections = requiredSections.filter((s) => {
    const segs = segments.filter((seg) => seg.sectionId === s.id);
    return segs.length > 0;
  });
  const isComplete = requiredSections.length > 0 && completedSections.length === requiredSections.length;
  const progressPercent = requiredSections.length > 0
    ? Math.round((completedSections.length / requiredSections.length) * 100)
    : 0;

  // Gap analysis for chat
  const gaps = sections
    .filter(s => {
      const segs = segments.filter(seg => seg.sectionId === s.id);
      const currentDuration = segs.reduce((sum, seg) => sum + seg.duration, 0);
      const targetDuration = s.suggestedDuration || s.minDuration || 60;
      return segs.length === 0 || currentDuration < targetDuration * 0.5;
    })
    .map(s => ({
      sectionName: s.name,
      missingDuration: (s.suggestedDuration || 60) - segments.filter(seg => seg.sectionId === s.id).reduce((sum, seg) => sum + seg.duration, 0),
      suggestion: s.exampleText || `Grave conteudo para ${s.name}`,
    }));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          <p className="text-sm text-zinc-500">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-zinc-950 flex">
        <audio ref={audioRef} src={audioUrl || undefined} />

        {/* Main Canvas Area */}
        <div className={cn(
          "flex-1 flex flex-col transition-all duration-300",
          isChatOpen ? "mr-96" : "mr-0"
        )}>

          {/* Compact Header */}
          <header className="flex-shrink-0 h-12 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/editor/${resolvedParams.id}`)}
                className="text-zinc-400 hover:text-white h-8 px-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div className="h-4 w-px bg-zinc-800" />

              {/* Template Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                  disabled={isOrganizing}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-1 rounded-md text-sm transition-all",
                    selectedTemplateId
                      ? "bg-zinc-800/50 text-white hover:bg-zinc-800"
                      : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  )}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span className="max-w-32 truncate">
                    {selectedTemplate?.name || "Template"}
                  </span>
                  <ChevronDown className={cn(
                    "h-3 w-3 transition-transform",
                    showTemplateSelector && "rotate-180"
                  )} />
                </button>

                <AnimatePresence>
                  {showTemplateSelector && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute top-full left-0 mt-1.5 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-1.5 max-h-72 overflow-y-auto">
                        {templates.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => handleSelectTemplate(template)}
                            className={cn(
                              "w-full text-left px-2.5 py-2 rounded-md transition-colors flex items-center justify-between",
                              template.id === selectedTemplateId
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "hover:bg-zinc-800 text-zinc-300"
                            )}
                          >
                            <div>
                              <span className="text-sm font-medium">{template.name}</span>
                              <span className="text-xs text-zinc-500 ml-2">
                                {template.sections?.length || 0} secoes
                              </span>
                            </div>
                            {template.id === selectedTemplateId && (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Progress */}
              {selectedTemplateId && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-zinc-500 font-mono">{progressPercent}%</span>
                </div>
              )}

              {/* Duration */}
              <div className="flex items-center gap-1 text-xs text-zinc-500 px-2">
                <Clock className="h-3 w-3" />
                <span className="font-mono">{formatTime(totalDuration)}</span>
              </div>

              {/* Export */}
              {isComplete && (
                <Button
                  size="sm"
                  onClick={handleExport}
                  className="bg-emerald-600 hover:bg-emerald-500 h-7 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Exportar
                </Button>
              )}

              {/* Chat Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={cn(
                  "h-8 w-8 p-0 transition-colors",
                  isChatOpen ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-400 hover:text-white"
                )}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {/* Organizing Progress */}
          <AnimatePresence>
            {isOrganizing && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex-shrink-0 border-b border-zinc-800/50 overflow-hidden"
              >
                <div className="px-6 py-3 flex items-center gap-3">
                  <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-300">{currentOrganizingSection || "Analisando..."}</span>
                      <span className="text-zinc-500">{organizingStep}/{organizingTotal}</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${(organizingStep / organizingTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Canvas Content */}
          <main className="flex-1 overflow-auto">
            {!selectedTemplateId ? (
              /* Empty State */
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center max-w-lg">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-6">
                    <LayoutTemplate className="h-10 w-10 text-emerald-400" />
                  </div>
                  <h1 className="text-2xl font-semibold text-white mb-3">
                    Organizador de Podcast
                  </h1>
                  <p className="text-zinc-400 mb-8">
                    Escolha um template para organizar seus segmentos automaticamente com IA.
                  </p>
                  <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                    {templates.slice(0, 4).map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-900 transition-all text-left group"
                      >
                        <h3 className="font-medium text-white group-hover:text-emerald-400 transition-colors">
                          {template.name}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1">
                          {template.sections?.length || 0} secoes
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Canvas - Visual Template View */
              <div className="p-6 max-w-5xl mx-auto">
                {/* Visual Flow Diagram */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-sm font-medium text-zinc-400">Estrutura do Podcast</h2>
                    <Badge variant="secondary" className="text-xs">
                      {sections.length} secoes
                    </Badge>
                  </div>

                  {/* Flow Timeline */}
                  <div className="flex items-center gap-1">
                    {sections.map((section, idx) => {
                      const sectionSegs = segments.filter(s => s.sectionId === section.id);
                      const hasSeg = sectionSegs.length > 0;
                      const colors = getColorForType(section.type);
                      const isFocused = focusedSectionId === section.id;

                      return (
                        <Tooltip key={section.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setFocusedSectionId(isFocused ? null : section.id)}
                              className={cn(
                                "flex-1 h-10 rounded-lg border-2 transition-all flex items-center justify-center",
                                hasSeg ? colors.bg : "bg-zinc-800/30",
                                isFocused ? "border-white ring-2 ring-white/20" : hasSeg ? colors.border : "border-zinc-800",
                              )}
                            >
                              {hasSeg ? (
                                <CheckCircle2 className={cn("h-4 w-4", colors.text)} />
                              ) : (
                                <span className="text-xs text-zinc-600">{idx + 1}</span>
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{section.name}</p>
                            <p className="text-xs text-zinc-400">
                              {hasSeg ? `${sectionSegs.length} segmento(s)` : "Vazio"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>

                {/* Section Cards Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {sections.map((section, idx) => {
                    const sectionSegs = segments.filter(s => s.sectionId === section.id);
                    const sectionDuration = sectionSegs.reduce((sum, s) => sum + s.duration, 0);
                    const targetDuration = section.suggestedDuration || section.minDuration || 60;
                    const isEmpty = sectionSegs.length === 0;
                    const colors = getColorForType(section.type);
                    const isFocused = focusedSectionId === section.id;

                    return (
                      <motion.div
                        key={section.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                          "rounded-xl border-2 transition-all overflow-hidden",
                          isFocused ? "border-white ring-2 ring-white/10" :
                          isEmpty && section.isRequired ? "border-amber-500/30 bg-amber-500/5" :
                          isEmpty ? "border-zinc-800 bg-zinc-900/30" :
                          cn(colors.border, colors.bg)
                        )}
                      >
                        {/* Card Header */}
                        <div className="p-4 flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                "w-6 h-6 rounded-md flex items-center justify-center text-xs font-medium",
                                isEmpty ? "bg-zinc-800 text-zinc-500" : cn(colors.bg, colors.text)
                              )}>
                                {idx + 1}
                              </span>
                              <h3 className="font-medium text-white">{section.name}</h3>
                              {section.isRequired && isEmpty && (
                                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs mt-2">
                              <span className="text-zinc-500 font-mono">
                                {formatTime(sectionDuration)} / {formatTime(targetDuration)}
                              </span>
                              {!isEmpty && (
                                <span className="text-zinc-600">
                                  {sectionSegs.length} seg
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRecordSection(section)}
                                  className="h-7 w-7 p-0 text-zinc-500 hover:text-emerald-400"
                                >
                                  <Mic className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Gravar</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        {/* Segments */}
                        {sectionSegs.length > 0 && (
                          <div className="px-4 pb-4 space-y-1.5">
                            {sectionSegs.map((seg) => {
                              const isPlaying = playingSegmentId === seg.id;
                              return (
                                <button
                                  key={seg.id}
                                  onClick={() => playSegment(seg)}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all text-left",
                                    isPlaying
                                      ? "bg-white/10 ring-1 ring-white/20"
                                      : "bg-black/20 hover:bg-black/30"
                                  )}
                                >
                                  <div className={cn(
                                    "w-6 h-6 rounded flex items-center justify-center flex-shrink-0",
                                    isPlaying ? "bg-white text-black" : "bg-zinc-700/50 text-zinc-400"
                                  )}>
                                    {isPlaying ? (
                                      <Pause className="h-3 w-3" />
                                    ) : (
                                      <Play className="h-3 w-3" />
                                    )}
                                  </div>
                                  <span className="flex-1 text-xs text-zinc-300 truncate">
                                    {seg.title || "Segmento"}
                                  </span>
                                  <span className="text-[10px] text-zinc-500 font-mono">
                                    {formatTime(seg.duration)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Empty State */}
                        {isEmpty && (
                          <div className="px-4 pb-4">
                            <button
                              onClick={() => handleRecordSection(section)}
                              className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-dashed border-zinc-700/50 text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
                            >
                              <Mic className="h-4 w-4" />
                              <span className="text-xs">Gravar conteudo</span>
                            </button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Bottom Actions */}
                {selectedTemplateId && (
                  <div className="mt-8 flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const template = templates.find(t => t.id === selectedTemplateId);
                        if (template) handleSelectTemplate(template);
                      }}
                      className="border-zinc-700 text-zinc-300"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Reorganizar com IA
                    </Button>

                    {isComplete && (
                      <Button
                        onClick={handleExport}
                        className="bg-emerald-600 hover:bg-emerald-500"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Exportar Podcast
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

        {/* Chat Sidebar */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ x: 384, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 384, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-96 bg-zinc-900 border-l border-zinc-800 z-40"
            >
              <EditorChat
                projectId={resolvedParams.id}
                userId={project?.userId || "anonymous"}
                onAction={handleChatAction}
                isOpen={isChatOpen}
                onToggle={() => setIsChatOpen(false)}
                inline={true}
                templateData={selectedTemplate ? {
                  name: selectedTemplate.name,
                  sections: sections.map(s => ({
                    id: s.id,
                    name: s.name,
                    type: s.type,
                    filled: segments.some(seg => seg.sectionId === s.id),
                    duration: segments
                      .filter(seg => seg.sectionId === s.id)
                      .reduce((sum, seg) => sum + seg.duration, 0),
                    targetDuration: s.suggestedDuration || s.minDuration || 60,
                  })),
                  gaps,
                } : undefined}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <InlineRecordingModal
          isOpen={recordingModal.isOpen}
          onClose={() => setRecordingModal((prev) => ({ ...prev, isOpen: false }))}
          sectionId={recordingModal.sectionId}
          sectionName={recordingModal.sectionName}
          targetDuration={recordingModal.targetDuration}
          exampleText={recordingModal.exampleText}
          onRecordingComplete={handleRecordingComplete}
        />
      </div>
    </TooltipProvider>
  );
}
