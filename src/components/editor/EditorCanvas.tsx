"use client";

import { useState, useMemo } from "react";
import { Segment, ProjectSection } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  FileText,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Volume2,
  Mic,
  BookOpen,
  Target,
  MessageSquare,
  Zap,
  Award,
  HelpCircle,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// Section with its segments
interface SectionWithSegments {
  section: ProjectSection;
  segments: Segment[];
}

interface EditorCanvasProps {
  segments: Segment[];
  sections?: SectionWithSegments[];
  selectedSegmentId?: string;
  currentTime: number;
  onSeekTo: (time: number) => void;
  onSelectSegment: (segmentId: string) => void;
  projectTitle?: string;
  originalDuration?: number;
  className?: string;
}

// Section type icons and colors
const SECTION_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  "introducao": { icon: Mic, color: "text-blue-400", bgColor: "bg-blue-500/20" },
  "intro": { icon: Mic, color: "text-blue-400", bgColor: "bg-blue-500/20" },
  "hook": { icon: Zap, color: "text-amber-400", bgColor: "bg-amber-500/20" },
  "contexto": { icon: BookOpen, color: "text-cyan-400", bgColor: "bg-cyan-500/20" },
  "desenvolvimento": { icon: Layers, color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
  "conteudo": { icon: FileText, color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
  "solucao": { icon: Target, color: "text-purple-400", bgColor: "bg-purple-500/20" },
  "exemplo": { icon: MessageSquare, color: "text-orange-400", bgColor: "bg-orange-500/20" },
  "conclusao": { icon: Award, color: "text-pink-400", bgColor: "bg-pink-500/20" },
  "cta": { icon: Zap, color: "text-red-400", bgColor: "bg-red-500/20" },
  "encerramento": { icon: Award, color: "text-pink-400", bgColor: "bg-pink-500/20" },
  "default": { icon: HelpCircle, color: "text-zinc-400", bgColor: "bg-zinc-500/20" },
};

function getSectionConfig(name: string) {
  const key = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return SECTION_CONFIG[key] || SECTION_CONFIG["default"];
}

export function EditorCanvas({
  segments,
  sections,
  selectedSegmentId,
  currentTime,
  onSeekTo,
  onSelectSegment,
  projectTitle,
  originalDuration = 0,
  className,
}: EditorCanvasProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Calculate stats
  const stats = useMemo(() => {
    const selected = segments.filter((s) => s.isSelected);
    const selectedDuration = selected.reduce(
      (sum, s) => sum + (s.endTime - s.startTime),
      0
    );
    const totalDuration = segments.reduce(
      (sum, s) => sum + (s.endTime - s.startTime),
      0
    );
    const avgInterest =
      segments.length > 0
        ? segments.reduce((sum, s) => sum + (s.interestScore || 0), 0) /
          segments.length
        : 0;

    return {
      total: segments.length,
      selected: selected.length,
      selectedDuration,
      totalDuration,
      avgInterest,
      reduction: totalDuration > 0 ? ((totalDuration - selectedDuration) / totalDuration) * 100 : 0,
    };
  }, [segments]);

  // Get selected segment details
  const selectedSegment = useMemo(
    () => segments.find((s) => s.id === selectedSegmentId),
    [segments, selectedSegmentId]
  );

  // Get current segment based on time
  const currentSegment = useMemo(
    () =>
      segments.find(
        (s) => currentTime >= s.startTime && currentTime <= s.endTime
      ),
    [segments, currentTime]
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Render a single segment item
  const renderSegmentItem = (segment: Segment, index: number, globalIndex: number) => (
    <button
      key={segment.id}
      onClick={() => onSelectSegment(segment.id)}
      className={cn(
        "w-full px-6 py-4 flex items-start gap-4 hover:bg-zinc-900/80 transition-colors text-left group",
        currentSegment?.id === segment.id && "bg-emerald-500/5 border-l-2 border-emerald-500",
        !segment.isSelected && "opacity-60"
      )}
    >
      {/* Segment Number */}
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-semibold transition-colors",
          segment.isSelected
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700"
        )}
      >
        {globalIndex + 1}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Meta row */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs text-zinc-500 font-mono">
            {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
          </span>
          {segment.topic && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400 font-medium">
              {segment.topic}
            </span>
          )}
          {segment.keyInsight && (
            <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
          )}
          {segment.hasError && (
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
          )}
        </div>

        {/* Text - show more lines */}
        <p className="text-sm text-zinc-300 leading-relaxed line-clamp-3">
          {segment.text}
        </p>

        {/* Scores bar */}
        {(segment.interestScore || segment.clarityScore) && (
          <div className="flex items-center gap-4 mt-2">
            {segment.interestScore && (
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${(segment.interestScore || 0) * 10}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-500">{segment.interestScore}/10</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2 shrink-0">
        {segment.isSelected ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <XCircle className="h-5 w-5 text-zinc-600" />
        )}
        <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
      </div>
    </button>
  );

  // If a segment is selected, show segment details
  if (selectedSegment) {
    const analysis = selectedSegment.analysis as {
      topic?: string;
      interestScore?: number;
      clarityScore?: number;
      keyInsight?: string;
      isTangent?: boolean;
      isRepetition?: boolean;
      hasFactualError?: boolean;
      hasContradiction?: boolean;
      needsRerecord?: boolean;
      rerecordSuggestion?: string;
    } | null;

    return (
      <div className={cn("flex flex-col h-full bg-zinc-950 p-6 overflow-auto", className)}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                selectedSegment.isSelected ? "bg-emerald-500" : "bg-zinc-600"
              )}
            />
            <h2 className="text-lg font-semibold text-white">
              Segmento {segments.indexOf(selectedSegment) + 1}
            </h2>
            <span className="text-sm text-zinc-500">
              {formatTime(selectedSegment.startTime)} -{" "}
              {formatTime(selectedSegment.endTime)}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSeekTo(selectedSegment.startTime)}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <Play className="h-4 w-4 mr-2" />
            Ouvir
          </Button>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-2 gap-6 flex-1">
          {/* Left Column - Transcription */}
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Transcricao
              </h3>
              <p className="text-white text-sm leading-relaxed">
                {selectedSegment.text}
              </p>
            </div>

            {/* Topic */}
            {analysis?.topic && (
              <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-400 mb-2">Topico</h3>
                <p className="text-emerald-400 font-medium">{analysis.topic}</p>
              </div>
            )}

            {/* Key Insight */}
            {analysis?.keyInsight && (
              <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
                <h3 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Insight Principal
                </h3>
                <p className="text-amber-200 text-sm">{analysis.keyInsight}</p>
              </div>
            )}
          </div>

          {/* Right Column - Analysis */}
          <div className="space-y-4">
            {/* Scores */}
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analise
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-500">Interesse</span>
                    <span className="text-xs font-medium text-emerald-400">
                      {selectedSegment.interestScore || 0}/10
                    </span>
                  </div>
                  <Progress
                    value={(selectedSegment.interestScore || 0) * 10}
                    className="h-2 bg-zinc-800"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-500">Clareza</span>
                    <span className="text-xs font-medium text-blue-400">
                      {selectedSegment.clarityScore || 0}/10
                    </span>
                  </div>
                  <Progress
                    value={(selectedSegment.clarityScore || 0) * 10}
                    className="h-2 bg-zinc-800"
                  />
                </div>
              </div>
            </div>

            {/* Flags */}
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-400 mb-3">Status</h3>
              <div className="flex flex-wrap gap-2">
                {selectedSegment.isSelected ? (
                  <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Selecionado
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-full text-xs bg-zinc-700 text-zinc-400 flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Nao selecionado
                  </span>
                )}
                {analysis?.isTangent && (
                  <span className="px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-400">
                    Tangente
                  </span>
                )}
                {analysis?.isRepetition && (
                  <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                    Repeticao
                  </span>
                )}
                {analysis?.hasFactualError && (
                  <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
                    Erro Factual
                  </span>
                )}
                {analysis?.needsRerecord && (
                  <span className="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400">
                    Regravar
                  </span>
                )}
              </div>
            </div>

            {/* Rerecord suggestion */}
            {analysis?.needsRerecord && analysis?.rerecordSuggestion && (
              <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
                <h3 className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Sugestao para Regravar
                </h3>
                <p className="text-purple-200 text-sm">
                  {analysis.rerecordSuggestion}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default view - Project Overview with Sections
  return (
    <div className={cn("flex flex-col h-full bg-zinc-950 overflow-hidden", className)}>
      {/* Compact Header with Stats */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {projectTitle || "Transcricao do Episodio"}
          </h2>
          <p className="text-xs text-zinc-500">
            {sections && sections.length > 0
              ? `${sections.length} secoes • ${stats.total} segmentos`
              : `${stats.total} segmentos • ${formatTime(stats.totalDuration)} total`
            }
          </p>
        </div>
        {/* Inline Stats */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-white font-medium">{stats.selected}</span>
            <span className="text-xs text-zinc-500">selecionados</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-white font-medium">{formatTime(stats.selectedDuration)}</span>
            <span className="text-xs text-zinc-500">editado</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-white font-medium">{stats.reduction.toFixed(0)}%</span>
            <span className="text-xs text-zinc-500">reducao</span>
          </div>
        </div>
      </div>

      {/* Content with Sections */}
      <div className="flex-1 overflow-auto">
        {sections && sections.length > 0 ? (
          // Render with sections
          <div>
            {sections.map((sectionData, sectionIndex) => {
              const config = getSectionConfig(sectionData.section.name);
              const Icon = config.icon;
              const isCollapsed = collapsedSections.has(sectionData.section.id);
              const sectionDuration = sectionData.segments.reduce(
                (sum, s) => sum + (s.endTime - s.startTime), 0
              );
              const selectedInSection = sectionData.segments.filter(s => s.isSelected).length;

              // Calculate global index for segment numbering
              let globalStartIndex = 0;
              for (let i = 0; i < sectionIndex; i++) {
                globalStartIndex += sections[i].segments.length;
              }

              return (
                <div key={sectionData.section.id} className="border-b border-zinc-800">
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(sectionData.section.id)}
                    className="w-full px-6 py-4 flex items-center gap-4 hover:bg-zinc-900/50 transition-colors"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      config.bgColor
                    )}>
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>

                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-white">
                          {sectionData.section.name}
                        </h3>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          sectionData.section.status === "approved" && "bg-emerald-500/20 text-emerald-400",
                          sectionData.section.status === "pending" && "bg-zinc-500/20 text-zinc-400",
                          sectionData.section.status === "blocked" && "bg-red-500/20 text-red-400",
                          sectionData.section.status === "review" && "bg-amber-500/20 text-amber-400",
                          !["approved", "pending", "blocked", "review"].includes(sectionData.section.status || "") && "bg-zinc-500/20 text-zinc-400"
                        )}>
                          {sectionData.section.status || "pending"}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {sectionData.segments.length} segmentos • {formatTime(sectionDuration)} • {selectedInSection} selecionados
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Section progress indicator */}
                      <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${sectionData.segments.length > 0 ? (selectedInSection / sectionData.segments.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500 w-10">
                        {sectionData.segments.length > 0
                          ? Math.round((selectedInSection / sectionData.segments.length) * 100)
                          : 0}%
                      </span>
                      <ChevronDown className={cn(
                        "h-5 w-5 text-zinc-500 transition-transform",
                        isCollapsed && "-rotate-90"
                      )} />
                    </div>
                  </button>

                  {/* Section Segments */}
                  {!isCollapsed && (
                    <div className="bg-zinc-950/50 divide-y divide-zinc-800/50">
                      {sectionData.segments.map((segment, index) =>
                        renderSegmentItem(segment, index, globalStartIndex + index)
                      )}
                      {sectionData.segments.length === 0 && (
                        <div className="px-6 py-8 text-center">
                          <p className="text-sm text-zinc-500">Nenhum segmento nesta secao</p>
                          <p className="text-xs text-zinc-600 mt-1">Arraste segmentos para esta secao ou grave novo conteudo</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Render without sections (flat list)
          <div className="divide-y divide-zinc-800/50">
            {segments.map((segment, index) => renderSegmentItem(segment, index, index))}
          </div>
        )}
      </div>
    </div>
  );
}
