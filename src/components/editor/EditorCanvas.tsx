"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Segment, ProjectSection } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
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
  Info,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineTextEditor, TextCut, WordTimestamp } from "@/components/editor/InlineTextEditor";

// Interface for section summaries
interface SectionSummary {
  sectionId: string;
  summary: string;
  isLoading: boolean;
}
import { Progress } from "@/components/ui/progress";

// Section with its segments
interface SectionWithSegments {
  section: ProjectSection;
  segments: Segment[];
}

interface EditorCanvasProps {
  segments: Segment[];
  sections?: SectionWithSegments[];
  highlightedSegmentId?: string;
  currentTime: number;
  isPlaying?: boolean;
  viewMode?: "full" | "edited" | "preview"; // Timeline viewing mode
  onSeekTo: (time: number) => void;
  onToggleSelect: (segmentId: string) => void;
  onSegmentClick?: (segmentId: string) => void; // For sync with timeline (no toggle)
  onPlaySegment?: (segmentId: string) => void; // Play segment from start
  onPauseSegment?: () => void; // Pause playback
  onUpdateSegment?: (segmentId: string, updates: Partial<Segment>) => void; // For inline editing
  projectTitle?: string;
  originalDuration?: number;
  className?: string;
}

// Section type icons and colors - with stronger header backgrounds for hierarchy
const SECTION_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string; headerBg: string; borderColor: string }> = {
  "introducao": { icon: Mic, color: "text-blue-400", bgColor: "bg-blue-500/20", headerBg: "bg-gradient-to-r from-blue-600/40 via-blue-500/20 to-transparent", borderColor: "border-l-blue-500" },
  "intro": { icon: Mic, color: "text-blue-400", bgColor: "bg-blue-500/20", headerBg: "bg-gradient-to-r from-blue-600/40 via-blue-500/20 to-transparent", borderColor: "border-l-blue-500" },
  "hook": { icon: Zap, color: "text-amber-400", bgColor: "bg-amber-500/20", headerBg: "bg-gradient-to-r from-amber-600/40 via-amber-500/20 to-transparent", borderColor: "border-l-amber-500" },
  "contexto": { icon: BookOpen, color: "text-cyan-400", bgColor: "bg-cyan-500/20", headerBg: "bg-gradient-to-r from-cyan-600/40 via-cyan-500/20 to-transparent", borderColor: "border-l-cyan-500" },
  "desenvolvimento": { icon: Layers, color: "text-emerald-400", bgColor: "bg-emerald-500/20", headerBg: "bg-gradient-to-r from-emerald-600/40 via-emerald-500/20 to-transparent", borderColor: "border-l-emerald-500" },
  "conteudo": { icon: FileText, color: "text-emerald-400", bgColor: "bg-emerald-500/20", headerBg: "bg-gradient-to-r from-emerald-600/40 via-emerald-500/20 to-transparent", borderColor: "border-l-emerald-500" },
  "solucao": { icon: Target, color: "text-purple-400", bgColor: "bg-purple-500/20", headerBg: "bg-gradient-to-r from-purple-600/40 via-purple-500/20 to-transparent", borderColor: "border-l-purple-500" },
  "exemplo": { icon: MessageSquare, color: "text-orange-400", bgColor: "bg-orange-500/20", headerBg: "bg-gradient-to-r from-orange-600/40 via-orange-500/20 to-transparent", borderColor: "border-l-orange-500" },
  "conclusao": { icon: Award, color: "text-pink-400", bgColor: "bg-pink-500/20", headerBg: "bg-gradient-to-r from-pink-600/40 via-pink-500/20 to-transparent", borderColor: "border-l-pink-500" },
  "cta": { icon: Zap, color: "text-red-400", bgColor: "bg-red-500/20", headerBg: "bg-gradient-to-r from-red-600/40 via-red-500/20 to-transparent", borderColor: "border-l-red-500" },
  "encerramento": { icon: Award, color: "text-pink-400", bgColor: "bg-pink-500/20", headerBg: "bg-gradient-to-r from-pink-600/40 via-pink-500/20 to-transparent", borderColor: "border-l-pink-500" },
  "default": { icon: HelpCircle, color: "text-zinc-400", bgColor: "bg-zinc-500/20", headerBg: "bg-gradient-to-r from-zinc-600/40 via-zinc-500/20 to-transparent", borderColor: "border-l-zinc-500" },
};

function getSectionConfig(name: string) {
  const key = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return SECTION_CONFIG[key] || SECTION_CONFIG["default"];
}

export function EditorCanvas({
  segments,
  sections,
  highlightedSegmentId,
  currentTime,
  isPlaying = false,
  viewMode = "full",
  onSeekTo,
  onToggleSelect,
  onSegmentClick,
  onPlaySegment,
  onPauseSegment,
  onUpdateSegment,
  projectTitle,
  originalDuration = 0,
  className,
}: EditorCanvasProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set());
  const [sectionSummaries, setSectionSummaries] = useState<Record<string, SectionSummary>>({});
  const segmentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrolledSegmentId = useRef<string | null>(null);

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

  // Get current segment based on time
  const currentSegment = useMemo(
    () =>
      segments.find(
        (s) => currentTime >= s.startTime && currentTime <= s.endTime
      ),
    [segments, currentTime]
  );

  // Calculate progress within current segment (0-100)
  const segmentProgress = useMemo(() => {
    if (!currentSegment) return 0;
    const segmentDuration = currentSegment.endTime - currentSegment.startTime;
    if (segmentDuration === 0) return 0;
    return ((currentTime - currentSegment.startTime) / segmentDuration) * 100;
  }, [currentSegment, currentTime]);

  // Track if we passed through a gap (no segment)
  const wasInGapRef = useRef(false);

  // Detect when entering a gap
  useEffect(() => {
    if (!currentSegment && isPlaying) {
      // We're in a gap while playing
      wasInGapRef.current = true;
    }
  }, [currentSegment, isPlaying]);

  // Auto-scroll: In "full" mode always scroll, in "edited" mode skip if came from gap
  useEffect(() => {
    // No segment = no scroll
    if (!currentSegment) {
      return;
    }

    // Same segment = no scroll
    if (lastScrolledSegmentId.current === currentSegment.id) {
      return;
    }

    // Check if we came from a gap
    const cameFromGap = wasInGapRef.current;

    // Update refs
    lastScrolledSegmentId.current = currentSegment.id;
    wasInGapRef.current = false; // Reset gap flag

    // In "full" mode (original), ALWAYS scroll to segment (even if excluded)
    // In "edited" mode, don't scroll if we came from a gap
    if (viewMode !== "full" && cameFromGap) {
      return;
    }

    // Don't scroll if not playing
    if (!isPlaying) {
      return;
    }

    const segmentElement = segmentRefs.current.get(currentSegment.id);
    if (segmentElement) {
      segmentElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentSegment?.id, isPlaying, viewMode]);

  // Reset when playback stops
  useEffect(() => {
    if (!isPlaying) {
      lastScrolledSegmentId.current = null;
      wasInGapRef.current = false;
    }
  }, [isPlaying]);

  // Scroll to highlighted segment when it changes (from timeline)
  useEffect(() => {
    if (!highlightedSegmentId) return;

    // Don't scroll if we're playing (the other effect handles that)
    if (isPlaying) return;

    const segmentElement = segmentRefs.current.get(highlightedSegmentId);
    if (segmentElement && containerRef.current) {
      segmentElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightedSegmentId, isPlaying]);

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

  // Toggle summary visibility and generate if needed
  const toggleSummary = async (sectionId: string, sectionSegments: Segment[]) => {
    const isExpanded = expandedSummaries.has(sectionId);

    if (isExpanded) {
      // Just collapse
      setExpandedSummaries(prev => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
      return;
    }

    // Expand and generate summary if not already cached
    setExpandedSummaries(prev => {
      const next = new Set(prev);
      next.add(sectionId);
      return next;
    });

    // Check if we already have a summary
    if (sectionSummaries[sectionId]?.summary) {
      return;
    }

    // Generate summary
    setSectionSummaries(prev => ({
      ...prev,
      [sectionId]: { sectionId, summary: "", isLoading: true }
    }));

    try {
      // Combine segment texts for summary generation
      const fullText = sectionSegments.map(s => s.text).join(" ");

      // Call API to generate summary
      const response = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: fullText,
          maxWords: 200,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSectionSummaries(prev => ({
          ...prev,
          [sectionId]: { sectionId, summary: data.summary, isLoading: false }
        }));
      } else {
        // Fallback: generate a simple summary from topics and key insights
        const topics = [...new Set(sectionSegments.map(s => s.topic).filter(Boolean))];
        const insights = sectionSegments.map(s => s.keyInsight).filter(Boolean);
        const fallbackSummary = topics.length > 0
          ? `Esta secao aborda os seguintes topicos: ${topics.join(", ")}. ${insights.length > 0 ? `Principais insights: ${insights.slice(0, 3).join("; ")}` : ""}`
          : `Secao com ${sectionSegments.length} segmentos de audio. Duracao total: ${formatTime(sectionSegments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0))}.`;

        setSectionSummaries(prev => ({
          ...prev,
          [sectionId]: { sectionId, summary: fallbackSummary, isLoading: false }
        }));
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      // Fallback summary
      const topics = [...new Set(sectionSegments.map(s => s.topic).filter(Boolean))];
      const fallbackSummary = topics.length > 0
        ? `Topicos abordados: ${topics.join(", ")}.`
        : `Secao com ${sectionSegments.length} segmentos.`;

      setSectionSummaries(prev => ({
        ...prev,
        [sectionId]: { sectionId, summary: fallbackSummary, isLoading: false }
      }));
    }
  };

  // Render a single segment item
  const renderSegmentItem = (segment: Segment, index: number, globalIndex: number) => {
    const isCurrentSegment = currentSegment?.id === segment.id;
    const isHighlightedFromTimeline = highlightedSegmentId === segment.id && !isCurrentSegment;
    const segmentDuration = segment.endTime - segment.startTime;
    const progressPercent = isCurrentSegment ? segmentProgress : 0;

    return (
      <div
        key={segment.id}
        ref={(el) => {
          if (el) {
            segmentRefs.current.set(segment.id, el);
          } else {
            segmentRefs.current.delete(segment.id);
          }
        }}
        className="relative"
      >
        {/* Progress bar overlay for current segment */}
        {isCurrentSegment && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none z-0"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.1 }}
          />
        )}

        <button
          onClick={() => {
            // Call onSegmentClick for sync (highlight in timeline), not toggle
            onSegmentClick?.(segment.id);
          }}
          className={cn(
            "w-full px-6 py-4 flex items-start gap-4 hover:bg-zinc-900/80 transition-all text-left group relative z-10",
            // Current segment playing - always highlighted
            isCurrentSegment && "bg-emerald-500/5 border-l-4 border-emerald-500 shadow-lg shadow-emerald-500/10",
            // Highlighted from timeline click (when not current)
            isHighlightedFromTimeline && "bg-blue-500/10 border-l-4 border-blue-500 shadow-lg shadow-blue-500/10",
            // Dim other segments when one is playing (but not current or highlighted)
            !isCurrentSegment && !isHighlightedFromTimeline && currentSegment && "opacity-50",
            // Dim non-selected segments (but not if it's the current segment playing)
            !segment.isSelected && !isCurrentSegment && !isHighlightedFromTimeline && "opacity-60"
          )}
        >
          {/* Playing indicator for current segment */}
          {isCurrentSegment && (
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"
              layoutId="playhead"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </motion.div>
          )}

          {/* Segment Number / Play-Pause Button */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (isCurrentSegment && isPlaying && onPauseSegment) {
                // Currently playing this segment - pause it
                onPauseSegment();
              } else if (onPlaySegment) {
                // Not playing or playing different segment - play this one
                onPlaySegment(segment.id);
              }
            }}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-semibold transition-all cursor-pointer",
              isCurrentSegment && isPlaying
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600"
                : isCurrentSegment && !isPlaying
                ? "bg-emerald-500/80 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-500"
                : isHighlightedFromTimeline
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600"
                : segment.isSelected
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                : "bg-zinc-800 text-zinc-500 hover:bg-emerald-500 hover:text-white"
            )}
            title={isCurrentSegment && isPlaying ? "Pausar" : "Reproduzir segmento"}
          >
            {isCurrentSegment && isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Meta row */}
            <div className="flex items-center gap-3 mb-2">
              <span className={cn(
                "text-xs font-mono",
                isCurrentSegment ? "text-emerald-400" : "text-zinc-500"
              )}>
                {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
              </span>
              {isCurrentSegment && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500 text-white font-medium animate-pulse">
                  {formatTime(currentTime - segment.startTime)} / {formatTime(segmentDuration)}
                </span>
              )}
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

            {/* Text - editable inline */}
            {onUpdateSegment ? (
              <InlineTextEditor
                text={segment.editedText || segment.text}
                originalText={segment.text}
                textCuts={(segment.textCuts as TextCut[]) || []}
                wordTimestamps={(segment.wordTimestamps as WordTimestamp[]) || []}
                segmentStartTime={segment.startTime}
                segmentEndTime={segment.endTime}
                onSave={(newText, textCuts) => {
                  onUpdateSegment(segment.id, {
                    editedText: newText,
                    textCuts: textCuts as unknown as Record<string, unknown>
                  });
                }}
                isCurrentSegment={isCurrentSegment}
              />
            ) : (
              <p className={cn(
                "text-sm leading-relaxed line-clamp-3 transition-colors",
                isCurrentSegment ? "text-white" : "text-zinc-300"
              )}>
                {segment.editedText || segment.text}
              </p>
            )}

            {/* Progress bar within segment */}
            {isCurrentSegment && (
              <div className="mt-3">
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>
            )}

            {/* Scores bar - only show when not playing */}
            {!isCurrentSegment && (segment.interestScore || segment.clarityScore) && (
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

          {/* Status indicator - clickable for toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {isCurrentSegment && isPlaying ? (
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-emerald-500 rounded-full"
                      animate={{
                        height: [12, 20, 12],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.3,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(segment.id);
                }}
                className="p-1 rounded-full hover:bg-zinc-800 cursor-pointer transition-colors"
                title={segment.isSelected ? "Remover da selecao" : "Adicionar a selecao"}
              >
                {segment.isSelected ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-zinc-600 hover:text-zinc-400" />
                )}
              </div>
            )}
            <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </div>
        </button>
      </div>
    );
  };

  // Default view - Project Overview with Sections
  return (
    <div className={cn("flex flex-col h-full bg-zinc-950 overflow-hidden", className)}>
      {/* Current Segment Indicator Header */}
      <AnimatePresence>
        {currentSegment && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-emerald-500/10 border-b border-emerald-500/30 overflow-hidden"
          >
            <div className="px-6 py-2 flex items-center gap-4">
              <div className="flex items-center gap-2">
                {isPlaying && (
                  <div className="flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-0.5 bg-emerald-500 rounded-full"
                        animate={{
                          height: [8, 16, 8],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.3,
                        }}
                      />
                    ))}
                  </div>
                )}
                <span className="text-xs font-medium text-emerald-400">
                  {isPlaying ? "Reproduzindo" : "Pausado"}
                </span>
              </div>
              <span className="text-sm text-white font-medium truncate flex-1">
                {currentSegment.topic || `Segmento ${segments.indexOf(currentSegment) + 1}`}
              </span>
              <span className="text-xs text-emerald-400 font-mono">
                {formatTime(currentTime)} / {formatTime(currentSegment.endTime)}
              </span>
              <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-emerald-500 rounded-full"
                  animate={{ width: `${segmentProgress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
      <div ref={containerRef} className="flex-1 overflow-auto scroll-smooth">
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
                <div key={sectionData.section.id} className="border-b border-zinc-800/50">
                  {/* Section Header - Highlighted with gradient background */}
                  <button
                    onClick={() => toggleSection(sectionData.section.id)}
                    className={cn(
                      "w-full px-6 py-5 flex items-center gap-4 transition-all border-l-4",
                      config.headerBg,
                      config.borderColor,
                      "hover:brightness-110"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                      config.bgColor
                    )}>
                      <Icon className={cn("h-6 w-6", config.color)} />
                    </div>

                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-3">
                        <h3 className={cn("text-lg font-bold", config.color)}>
                          {sectionData.section.name}
                        </h3>
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide",
                          sectionData.section.status === "approved" && "bg-emerald-500/30 text-emerald-300",
                          sectionData.section.status === "pending" && "bg-zinc-500/30 text-zinc-300",
                          sectionData.section.status === "blocked" && "bg-red-500/30 text-red-300",
                          sectionData.section.status === "review" && "bg-amber-500/30 text-amber-300",
                          !["approved", "pending", "blocked", "review"].includes(sectionData.section.status || "") && "bg-zinc-500/30 text-zinc-300"
                        )}>
                          {sectionData.section.status || "pending"}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 mt-1">
                        {sectionData.segments.length} segmentos • {formatTime(sectionDuration)} • {selectedInSection} selecionados
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Section progress indicator */}
                      <div className="w-28 h-2.5 bg-zinc-800/80 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", config.bgColor.replace('/20', ''))}
                          style={{ width: `${sectionData.segments.length > 0 ? (selectedInSection / sectionData.segments.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className={cn("text-sm font-medium w-12", config.color)}>
                        {sectionData.segments.length > 0
                          ? Math.round((selectedInSection / sectionData.segments.length) * 100)
                          : 0}%
                      </span>
                      {/* Summary button */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSummary(sectionData.section.id, sectionData.segments);
                        }}
                        className={cn(
                          "p-2 rounded-lg transition-colors cursor-pointer",
                          expandedSummaries.has(sectionData.section.id)
                            ? config.bgColor + " " + config.color
                            : "hover:bg-zinc-800/50 text-zinc-500 hover:text-zinc-300"
                        )}
                        title="Ver resumo da secao"
                      >
                        <Info className="h-5 w-5" />
                      </div>
                      <ChevronDown className={cn(
                        "h-6 w-6 transition-transform",
                        config.color,
                        isCollapsed && "-rotate-90"
                      )} />
                    </div>
                  </button>

                  {/* Section Summary Panel */}
                  <AnimatePresence>
                    {expandedSummaries.has(sectionData.section.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "overflow-hidden border-l-4",
                          config.borderColor
                        )}
                      >
                        <div className={cn(
                          "px-6 py-4",
                          config.bgColor.replace('/20', '/10')
                        )}>
                          <div className="flex items-start gap-3">
                            <Info className={cn("h-5 w-5 mt-0.5 shrink-0", config.color)} />
                            <div className="flex-1">
                              <h4 className={cn("text-sm font-semibold mb-2", config.color)}>
                                Resumo da Secao
                              </h4>
                              {sectionSummaries[sectionData.section.id]?.isLoading ? (
                                <div className="flex items-center gap-2 text-zinc-400">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="text-sm">Gerando resumo...</span>
                                </div>
                              ) : (
                                <p className="text-sm text-zinc-300 leading-relaxed">
                                  {sectionSummaries[sectionData.section.id]?.summary || "Clique para gerar o resumo desta secao."}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

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
