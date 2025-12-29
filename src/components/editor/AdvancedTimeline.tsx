"use client";

import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Segment, SegmentAnalysis } from "@/lib/db/schema";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  Tag,
  FileText,
  Sparkles,
  AlertTriangle,
  MessageSquare,
  MousePointer2,
  Flame,
  Star,
  Minus,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdvancedTimelineRef {
  playSegment: (segment: Segment) => void;
  seekToTime: (time: number) => void;
  getCurrentTime: () => number;
}

export type TimelineMode = "full" | "edited" | "preview";

export interface PreviewRange {
  segmentIds: string[];
  label?: string;
}

interface AdvancedTimelineProps {
  segments: Segment[];
  audioUrl: string | null;
  onToggleSelect: (segmentId: string) => void;
  onSelectRange?: (segmentIds: string[], select: boolean) => void;
  onUpdateSegment?: (segmentId: string, updates: Partial<Segment>) => void;
  className?: string;
  initialMode?: TimelineMode;
  previewRange?: PreviewRange;
  onPreviewClose?: () => void;
}

// Segment detail modal
interface SegmentDetailProps {
  segment: Segment;
  isOpen: boolean;
  onClose: () => void;
  onToggleSelect: () => void;
  onPlay: () => void;
  formatTime: (seconds: number) => string;
}

function SegmentDetail({ segment, isOpen, onClose, onToggleSelect, onPlay, formatTime }: SegmentDetailProps) {
  if (!isOpen) return null;

  const analysis = segment.analysis as SegmentAnalysis | null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-zinc-900 rounded-2xl border border-zinc-700 max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              segment.isSelected ? "bg-emerald-500" : "bg-zinc-700"
            )}>
              {segment.isSelected ? (
                <Check className="h-5 w-5 text-white" />
              ) : (
                <FileText className="h-5 w-5 text-zinc-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-white">
                {segment.topic || "Segmento"}
              </h3>
              <p className="text-xs text-zinc-500">
                {formatTime(segment.startTime)} - {formatTime(segment.endTime)} ({formatTime(segment.endTime - segment.startTime)})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {/* Summary */}
          {analysis?.keyInsight && (
            <div className="mb-4 p-3 bg-zinc-800/50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-medium text-amber-400 uppercase">Resumo</span>
              </div>
              <p className="text-sm text-zinc-300">{analysis.keyInsight}</p>
            </div>
          )}

          {/* Warnings */}
          {(analysis?.hasFactualError || analysis?.hasContradiction || analysis?.isTangent || analysis?.isRepetition) && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-xs font-medium text-red-400 uppercase">Avisos</span>
              </div>
              <div className="space-y-1 text-sm text-red-300">
                {analysis?.hasFactualError && <p>Erro factual: {analysis.factualErrorDetail}</p>}
                {analysis?.hasContradiction && <p>Contradicao: {analysis.contradictionDetail}</p>}
                {analysis?.isTangent && <p>Tangente - fora do topico principal</p>}
                {analysis?.isRepetition && <p>Conteudo repetido</p>}
              </div>
            </div>
          )}

          {/* Full Text */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-zinc-500" />
              <span className="text-xs font-medium text-zinc-500 uppercase">Transcricao Completa</span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {segment.text}
            </p>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-zinc-800/50 rounded-xl">
              <div className="text-xs text-zinc-500 mb-1">Interesse</div>
              <div className={cn(
                "text-2xl font-bold",
                (segment.interestScore || 0) >= 7 ? "text-emerald-400" :
                (segment.interestScore || 0) >= 5 ? "text-amber-400" : "text-red-400"
              )}>
                {segment.interestScore || 0}/10
              </div>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-xl">
              <div className="text-xs text-zinc-500 mb-1">Clareza</div>
              <div className={cn(
                "text-2xl font-bold",
                (segment.clarityScore || 0) >= 7 ? "text-emerald-400" :
                (segment.clarityScore || 0) >= 5 ? "text-amber-400" : "text-red-400"
              )}>
                {segment.clarityScore || 0}/10
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 p-4 border-t border-zinc-800">
          <button
            onClick={onPlay}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
          >
            <Play className="h-4 w-4" fill="currentColor" />
            Ouvir Segmento
          </button>
          <button
            onClick={onToggleSelect}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl transition-colors",
              segment.isSelected
                ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                : "bg-emerald-500 hover:bg-emerald-400 text-white"
            )}
          >
            {segment.isSelected ? (
              <>
                <X className="h-4 w-4" />
                Remover
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Selecionar
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Confirmation modal for adding segment
interface AddConfirmModalProps {
  segment: Segment;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onPlay: () => void;
  formatTime: (seconds: number) => string;
}

function AddConfirmModal({ segment, isOpen, onClose, onConfirm, onPlay, formatTime }: AddConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-zinc-900 rounded-2xl border border-zinc-700 max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
            <Check className="h-6 w-6 text-emerald-400" />
          </div>
          <h3 className="font-semibold text-white text-lg">
            Adicionar segmento?
          </h3>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="bg-zinc-800/50 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-zinc-500" />
              <span className="text-sm font-medium text-white">
                {segment.topic || "Sem topico"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 line-clamp-3">
              {segment.text}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
              <span>{formatTime(segment.startTime)} - {formatTime(segment.endTime)}</span>
              <span>Score: {segment.interestScore || 0}/10</span>
            </div>
          </div>

          <p className="text-sm text-zinc-400 text-center">
            Deseja adicionar este segmento a edicao final?
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 p-4 border-t border-zinc-800">
          <button
            onClick={onPlay}
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-colors"
            title="Ouvir"
          >
            <Play className="h-4 w-4" fill="currentColor" />
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition-colors"
          >
            <Check className="h-4 w-4" />
            Adicionar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Range selection confirmation modal
interface RangeConfirmModalProps {
  segments: Segment[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  formatTime: (seconds: number) => string;
}

function RangeConfirmModal({ segments, isOpen, onClose, onConfirm, formatTime }: RangeConfirmModalProps) {
  if (!isOpen || segments.length === 0) return null;

  const totalDuration = segments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
  const alreadySelected = segments.filter(s => s.isSelected).length;
  const toAdd = segments.length - alreadySelected;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-zinc-900 rounded-2xl border border-zinc-700 max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
            <MousePointer2 className="h-6 w-6 text-blue-400" />
          </div>
          <h3 className="font-semibold text-white text-lg">
            Selecionar {segments.length} segmentos?
          </h3>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white">{segments.length}</div>
              <div className="text-xs text-zinc-500">Segmentos</div>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-emerald-400">{formatTime(totalDuration)}</div>
              <div className="text-xs text-zinc-500">Duracao</div>
            </div>
          </div>

          {alreadySelected > 0 && (
            <p className="text-xs text-zinc-500 text-center">
              {alreadySelected} ja selecionados, {toAdd} serao adicionados
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition-colors"
          >
            <Check className="h-4 w-4" />
            Selecionar Todos
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export const AdvancedTimeline = forwardRef<AdvancedTimelineRef, AdvancedTimelineProps>(
  function AdvancedTimeline({ segments, audioUrl, onToggleSelect, onSelectRange, onUpdateSegment, className, initialMode = "full", previewRange, onPreviewClose }, ref) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [selectedSegmentDetail, setSelectedSegmentDetail] = useState<Segment | null>(null);
    const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
    const [mode, setMode] = useState<TimelineMode>(initialMode);

    // Range selection state
    const [rangeStartSegment, setRangeStartSegment] = useState<string | null>(null);
    const [rangeEndSegment, setRangeEndSegment] = useState<string | null>(null);
    const [isRangeSelecting, setIsRangeSelecting] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Modal states
    const [addConfirmSegment, setAddConfirmSegment] = useState<Segment | null>(null);
    const [rangeConfirmSegments, setRangeConfirmSegments] = useState<Segment[]>([]);

    // Tooltip position state
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
    const segmentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Scrubbing state (dragging on ruler)
    const [isScrubbing, setIsScrubbing] = useState(false);
    const rulerRef = useRef<HTMLDivElement>(null);

    // Auto-switch to preview mode when previewRange is provided
    useEffect(() => {
      if (previewRange && previewRange.segmentIds.length > 0) {
        setMode("preview");
      }
    }, [previewRange]);

    // Get segments based on mode
    const displaySegments = mode === "edited"
      ? segments.filter(s => s.isSelected).sort((a, b) => a.startTime - b.startTime)
      : mode === "preview" && previewRange
      ? segments.filter(s => previewRange.segmentIds.includes(s.id)).sort((a, b) => a.startTime - b.startTime)
      : segments;

    const selectedSegments = segments.filter(s => s.isSelected).sort((a, b) => a.startTime - b.startTime);

    // Calculate dimensions
    const totalDuration = segments.length > 0
      ? Math.max(...segments.map((s) => s.endTime))
      : 0;

    const editedDuration = selectedSegments.reduce(
      (sum, seg) => sum + (seg.endTime - seg.startTime),
      0
    );

    const previewDuration = displaySegments.reduce(
      (sum, seg) => sum + (seg.endTime - seg.startTime),
      0
    );

    // Duration to show based on mode
    const timelineDuration = mode === "edited"
      ? editedDuration
      : mode === "preview"
      ? previewDuration
      : totalDuration;

    const pixelsPerSecond = 10 * zoom;
    const timelineWidth = timelineDuration * pixelsPerSecond;
    const containerWidth = timelineRef.current?.clientWidth || 800;

    const formatTime = useCallback((seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }, []);

    // Expose methods
    useImperativeHandle(ref, () => ({
      playSegment: (segment: Segment) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = segment.startTime;
        audio.play();
      },
      seekToTime: (time: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = time;
      },
      getCurrentTime: () => currentTime,
    }));

    // Audio events
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
      const handleLoadedMetadata = () => setDuration(audio.duration);
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => setIsPlaying(false);

      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("play", handlePlay);
      audio.addEventListener("pause", handlePause);
      audio.addEventListener("ended", handleEnded);

      return () => {
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("play", handlePlay);
        audio.removeEventListener("pause", handlePause);
        audio.removeEventListener("ended", handleEnded);
      };
    }, []);

    // Auto-scroll to keep playhead visible
    useEffect(() => {
      if (!timelineRef.current || !isPlaying) return;
      const playheadPosition = currentTime * pixelsPerSecond;
      const visibleStart = scrollLeft;
      const visibleEnd = scrollLeft + containerWidth;

      if (playheadPosition < visibleStart || playheadPosition > visibleEnd - 100) {
        timelineRef.current.scrollLeft = Math.max(0, playheadPosition - 100);
      }
    }, [currentTime, pixelsPerSecond, scrollLeft, containerWidth, isPlaying]);

    // Auto-skip to next segment in preview/edited mode
    useEffect(() => {
      if (mode === "full" || !isPlaying || displaySegments.length === 0) return;

      const audio = audioRef.current;
      if (!audio) return;

      // Find current segment index
      let currentSegmentIndex = -1;
      for (let i = 0; i < displaySegments.length; i++) {
        const seg = displaySegments[i];
        if (currentTime >= seg.startTime && currentTime < seg.endTime) {
          currentSegmentIndex = i;
          break;
        }
      }

      // If not in any segment, find the next segment to jump to
      if (currentSegmentIndex === -1) {
        // Find the next segment that starts after current time
        const nextSegment = displaySegments.find(seg => seg.startTime > currentTime);

        if (nextSegment) {
          // Jump to start of next segment
          audio.currentTime = nextSegment.startTime;
        } else {
          // No more segments - check if we passed the last one
          const lastSegment = displaySegments[displaySegments.length - 1];
          if (currentTime >= lastSegment.endTime) {
            // Reached the end - pause
            audio.pause();
          }
        }
      }
    }, [currentTime, mode, isPlaying, displaySegments]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      setScrollLeft(e.currentTarget.scrollLeft);
    };

    const togglePlay = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
    };

    const seekTo = (time: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = Math.max(0, Math.min(time, duration));
    };

    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isRangeSelecting) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left + scrollLeft;
      const clickTime = clickX / pixelsPerSecond;
      seekTo(clickTime);
    };

    const getSegmentColor = (segment: Segment) => {
      if (segment.isSelected) return "bg-gradient-to-br from-emerald-500/60 to-emerald-600/40 backdrop-blur-sm";
      const analysis = segment.analysis as SegmentAnalysis | null;
      if (analysis?.hasFactualError || analysis?.hasContradiction) return "bg-gradient-to-br from-red-500/50 to-red-700/30 backdrop-blur-sm";
      if (analysis?.isTangent) return "bg-gradient-to-br from-amber-500/50 to-orange-600/30 backdrop-blur-sm";
      if (analysis?.isRepetition) return "bg-gradient-to-br from-yellow-500/40 to-amber-600/25 backdrop-blur-sm";
      if ((segment.interestScore || 0) < 5) return "bg-gradient-to-br from-zinc-500/40 to-zinc-700/30 backdrop-blur-sm";
      return "bg-gradient-to-br from-slate-400/50 to-slate-600/35 backdrop-blur-sm";
    };

    const getSegmentBorderColor = (segment: Segment) => {
      if (segment.isSelected) return "border-emerald-400/60";
      const analysis = segment.analysis as SegmentAnalysis | null;
      if (analysis?.hasFactualError || analysis?.hasContradiction) return "border-red-400/50";
      if (analysis?.isTangent) return "border-amber-400/50";
      if (analysis?.isRepetition) return "border-yellow-400/40";
      return "border-white/10";
    };

    // Get segments in range (sorted by startTime)
    const getSegmentsInRange = useCallback((startId: string | null, endId: string | null): string[] => {
      if (!startId || !endId) return [];

      const sortedSegments = [...displaySegments].sort((a, b) => a.startTime - b.startTime);
      const startIndex = sortedSegments.findIndex(s => s.id === startId);
      const endIndex = sortedSegments.findIndex(s => s.id === endId);

      if (startIndex === -1 || endIndex === -1) return [];

      const minIndex = Math.min(startIndex, endIndex);
      const maxIndex = Math.max(startIndex, endIndex);

      return sortedSegments.slice(minIndex, maxIndex + 1).map(s => s.id);
    }, [displaySegments]);

    // Check if segment is in current selection range
    const isInSelectionRange = useCallback((segmentId: string): boolean => {
      if (!isRangeSelecting || !rangeStartSegment) return false;
      const rangeIds = getSegmentsInRange(rangeStartSegment, rangeEndSegment || rangeStartSegment);
      return rangeIds.includes(segmentId);
    }, [isRangeSelecting, rangeStartSegment, rangeEndSegment, getSegmentsInRange]);

    // Handle range selection start
    const handleSegmentMouseDown = (e: React.MouseEvent, segmentId: string) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      setRangeStartSegment(segmentId);
      setRangeEndSegment(segmentId);
      setIsRangeSelecting(true);
      setIsDragging(false);
    };

    // Handle range selection during drag
    const handleSegmentMouseEnter = (segmentId: string, element: HTMLDivElement | null) => {
      if (isRangeSelecting && rangeStartSegment) {
        if (segmentId !== rangeStartSegment) {
          setIsDragging(true);
        }
        setRangeEndSegment(segmentId);
      } else {
        setHoveredSegment(segmentId);
        updateTooltipPosition(element);
      }
    };

    // Update tooltip position based on element
    const updateTooltipPosition = (element: HTMLDivElement | null) => {
      if (element) {
        const rect = element.getBoundingClientRect();
        setTooltipPosition({
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
      }
    };

    // Handle mouse move to update tooltip position during scroll
    const handleSegmentMouseMove = (element: HTMLDivElement | null) => {
      if (!isRangeSelecting) {
        updateTooltipPosition(element);
      }
    };

    // Handle range selection end - global mouse up handler
    useEffect(() => {
      const handleGlobalMouseUp = () => {
        if (!isRangeSelecting || !rangeStartSegment) return;

        // No actions in preview mode - just reset state
        if (mode === "preview") {
          setRangeStartSegment(null);
          setRangeEndSegment(null);
          setIsRangeSelecting(false);
          setIsDragging(false);
          return;
        }

        const rangeIds = getSegmentsInRange(rangeStartSegment, rangeEndSegment);
        const rangeSegments = rangeIds.map(id => segments.find(s => s.id === id)).filter(Boolean) as Segment[];

        if (rangeIds.length === 1 && !isDragging) {
          // Single click - check if segment is selected or not
          const segment = displaySegments.find(s => s.id === rangeStartSegment);
          if (segment) {
            if (mode === "full" && !segment.isSelected) {
              // Show confirmation modal before adding
              setAddConfirmSegment(segment);
            } else {
              // Already selected or in edited mode - show details
              setSelectedSegmentDetail(segment);
            }
          }
        } else if (rangeIds.length > 1 && onSelectRange) {
          // Range selection - show confirmation modal
          const notSelectedSegments = rangeSegments.filter(s => !s.isSelected);
          if (notSelectedSegments.length > 0) {
            // Some segments not selected - show confirmation
            setRangeConfirmSegments(rangeSegments);
          } else {
            // All already selected - just show details of first
            const firstSeg = rangeSegments[0];
            if (firstSeg) {
              setSelectedSegmentDetail(firstSeg);
            }
          }
        }

        // Reset range selection state
        setRangeStartSegment(null);
        setRangeEndSegment(null);
        setIsRangeSelecting(false);
        setIsDragging(false);
      };

      if (isRangeSelecting) {
        document.addEventListener('mouseup', handleGlobalMouseUp);
        return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
      }
    }, [isRangeSelecting, rangeStartSegment, rangeEndSegment, isDragging, displaySegments, segments, mode, onSelectRange, getSegmentsInRange]);

    // Cancel range selection if mouse leaves timeline
    const handleTimelineMouseLeave = () => {
      // Don't cancel if actively dragging
    };

    // Handle scrubbing on ruler (drag to seek)
    const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsScrubbing(true);

      // Seek to clicked position
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left + scrollLeft;
      const clickTime = clickX / pixelsPerSecond;
      seekTo(clickTime);
    };

    // Handle scrubbing move
    useEffect(() => {
      if (!isScrubbing) return;

      const handleMouseMove = (e: MouseEvent) => {
        if (!rulerRef.current) return;
        const rect = rulerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left + scrollLeft;
        const clickTime = Math.max(0, Math.min(clickX / pixelsPerSecond, timelineDuration));
        seekTo(clickTime);
      };

      const handleMouseUp = () => {
        setIsScrubbing(false);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isScrubbing, scrollLeft, pixelsPerSecond, timelineDuration]);

    // Handle keyboard zoom with Cmd/Ctrl + scroll
    const handleWheel = useCallback((e: WheelEvent) => {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.25 : 0.25;
        setZoom(prev => Math.max(0.5, Math.min(4, prev + delta)));
      }
    }, []);

    // Add wheel event listener for Cmd+scroll zoom
    useEffect(() => {
      const timeline = timelineRef.current;
      if (!timeline) return;

      timeline.addEventListener('wheel', handleWheel, { passive: false });
      return () => timeline.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    // Generate time markers
    const timeMarkers = [];
    const markerInterval = zoom >= 2 ? 10 : zoom >= 1 ? 30 : 60;
    for (let t = 0; t <= timelineDuration; t += markerInterval) {
      timeMarkers.push(t);
    }

    // Stats
    const reduction = totalDuration > 0 ? Math.round((1 - editedDuration / totalDuration) * 100) : 0;

    // Calculate segment position for edited mode
    const getSegmentPosition = (segment: Segment, index: number) => {
      if (mode === "full") {
        return {
          left: segment.startTime * pixelsPerSecond,
          width: (segment.endTime - segment.startTime) * pixelsPerSecond,
        };
      } else {
        // In edited mode, segments are placed sequentially
        let accumulatedTime = 0;
        for (let i = 0; i < index; i++) {
          const s = displaySegments[i];
          accumulatedTime += s.endTime - s.startTime;
        }
        return {
          left: accumulatedTime * pixelsPerSecond,
          width: (segment.endTime - segment.startTime) * pixelsPerSecond,
        };
      }
    };

    // Calculate playhead position based on mode
    const getPlayheadPosition = (): number | null => {
      if (mode === "full") {
        return currentTime * pixelsPerSecond;
      }

      // For edited/preview modes, find which segment contains the current time
      // and calculate position within the sequential layout
      let accumulatedPosition = 0;

      for (let i = 0; i < displaySegments.length; i++) {
        const segment = displaySegments[i];
        const segmentDuration = segment.endTime - segment.startTime;

        // Check if currentTime is within this segment's original time range
        if (currentTime >= segment.startTime && currentTime < segment.endTime) {
          // Current time is within this segment
          const timeIntoSegment = currentTime - segment.startTime;
          return accumulatedPosition + (timeIntoSegment * pixelsPerSecond);
        }

        // Also check if we're exactly at the end of the last segment
        if (i === displaySegments.length - 1 && currentTime === segment.endTime) {
          return accumulatedPosition + (segmentDuration * pixelsPerSecond);
        }

        accumulatedPosition += segmentDuration * pixelsPerSecond;
      }

      // Current time is not within any displayed segment
      return null;
    };

    const playheadPosition = getPlayheadPosition();

    return (
      <div className={cn("bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden", className)}>
        <audio ref={audioRef} src={audioUrl || undefined} />

        {/* Compact Header with Controls, Stats, Mode Toggle */}
        <div className="flex items-center gap-3 px-3 py-2 border-b border-zinc-800 bg-zinc-900/50">
          {/* Player Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => seekTo(currentTime - 10)}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              onClick={togglePlay}
              className="h-9 w-9 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center transition-colors"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 text-white" fill="currentColor" />
              ) : (
                <Play className="h-4 w-4 text-white ml-0.5" fill="currentColor" />
              )}
            </button>

            <button
              onClick={() => seekTo(currentTime + 10)}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <SkipForward className="h-4 w-4" />
            </button>

            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>

          {/* Time Display */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-white">{formatTime(currentTime)}</span>
            <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${(currentTime / totalDuration) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono text-zinc-500">{formatTime(totalDuration)}</span>
          </div>

          <div className="h-5 w-px bg-zinc-700" />

          {/* Mode Toggle */}
          <div className="flex items-center bg-zinc-800 rounded-md p-0.5">
            <button
              onClick={() => setMode("full")}
              className={cn(
                "px-2 py-1 rounded text-[10px] font-medium transition-colors",
                mode === "full" ? "bg-blue-500 text-white" : "text-zinc-400 hover:text-white"
              )}
            >
              Original
            </button>
            <button
              onClick={() => setMode("edited")}
              className={cn(
                "px-2 py-1 rounded text-[10px] font-medium transition-colors",
                mode === "edited" ? "bg-emerald-500 text-white" : "text-zinc-400 hover:text-white"
              )}
            >
              Editada
            </button>
            {previewRange && previewRange.segmentIds.length > 0 && (
              <button
                onClick={() => setMode("preview")}
                className={cn(
                  "px-2 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1",
                  mode === "preview" ? "bg-violet-500 text-white" : "text-zinc-400 hover:text-white"
                )}
              >
                <Eye className="h-3 w-3" />
                Preview
              </button>
            )}
          </div>

          {/* Preview Mode Indicator */}
          {mode === "preview" && previewRange && (
            <div className="flex items-center gap-2 bg-violet-500/20 border border-violet-500/30 rounded-md px-2 py-1">
              <Eye className="h-3 w-3 text-violet-400" />
              <span className="text-[10px] text-violet-300 font-medium">
                {previewRange.label || `${previewRange.segmentIds.length} segmentos`}
              </span>
              {onPreviewClose && (
                <button
                  onClick={() => {
                    setMode("full");
                    onPreviewClose();
                  }}
                  className="p-0.5 rounded hover:bg-violet-500/30 text-violet-400 hover:text-white transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          <div className="h-5 w-px bg-zinc-700" />

          {/* Stats */}
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-zinc-400">
              <span className="text-white font-medium">{formatTime(editedDuration)}</span> / {formatTime(totalDuration)}
            </span>
            <span className="text-amber-400 font-medium">-{reduction}%</span>
            <span className="text-purple-400">
              {selectedSegments.length}<span className="text-zinc-500">/{segments.length}</span>
            </span>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.5))}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] text-zinc-500 w-6 text-center">{zoom}x</span>
            <button
              onClick={() => setZoom(Math.min(4, zoom + 0.5))}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Timeline with Custom Scrollbar */}
        <div
          ref={timelineRef}
          className="overflow-x-auto overflow-y-hidden timeline-scroll"
          onScroll={handleScroll}
          onMouseLeave={handleTimelineMouseLeave}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#3f3f46 #18181b',
          }}
        >
          <div
            className="relative"
            style={{ width: `${Math.max(timelineWidth, containerWidth)}px`, minHeight: "80px" }}
            onClick={handleTimelineClick}
          >
            {/* Time Ruler - clickable/draggable to seek */}
            <div
              ref={rulerRef}
              className="h-5 bg-zinc-800/50 border-b border-zinc-700 relative cursor-ew-resize select-none"
              onMouseDown={handleRulerMouseDown}
            >
              {timeMarkers.map((t) => (
                <div
                  key={t}
                  className="absolute top-0 h-full flex items-center pointer-events-none"
                  style={{ left: `${t * pixelsPerSecond}px` }}
                >
                  <div className="h-2 w-px bg-zinc-600" />
                  <span className="text-[9px] text-zinc-500 ml-1">{formatTime(t)}</span>
                </div>
              ))}
            </div>

            {/* Segments Track */}
            <div className="relative h-14 bg-zinc-950">
              {displaySegments.map((segment, index) => {
                const { left, width } = getSegmentPosition(segment, index);
                const analysis = segment.analysis as SegmentAnalysis | null;
                const isHovered = hoveredSegment === segment.id;
                const inSelectionRange = isInSelectionRange(segment.id);

                return (
                  <motion.div
                    key={segment.id}
                    className={cn(
                      "absolute rounded cursor-pointer border select-none shadow-sm",
                      inSelectionRange
                        ? "bg-blue-400 border-blue-300 opacity-100 ring-2 ring-blue-300/50"
                        : getSegmentColor(segment),
                      !inSelectionRange && getSegmentBorderColor(segment),
                      !inSelectionRange && (segment.isSelected ? "opacity-100" : "opacity-70"),
                      isHovered && !isRangeSelecting && "ring-1 ring-white/30 shadow-md shadow-black/30 z-20"
                    )}
                    style={{
                      left: `${left + 1}px`,
                      width: `${Math.max(width - 2, 4)}px`,
                    }}
                    initial={false}
                    animate={{
                      top: isHovered && !isRangeSelecting ? 2 : 4,
                      height: isHovered && !isRangeSelecting ? "calc(100% - 4px)" : "calc(100% - 8px)",
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                      mass: 0.3
                    }}
                    onMouseDown={(e) => handleSegmentMouseDown(e, segment.id)}
                    onMouseEnter={(e) => handleSegmentMouseEnter(segment.id, e.currentTarget as HTMLDivElement)}
                    onMouseMove={(e) => handleSegmentMouseMove(e.currentTarget as HTMLDivElement)}
                    onMouseLeave={() => {
                      if (!isRangeSelecting) {
                        setHoveredSegment(null);
                        setTooltipPosition(null);
                      }
                    }}
                  >
                    {/* Segment Content - Compact */}
                    <div className="px-1.5 py-1 h-full flex items-center gap-1.5 overflow-hidden">
                      {/* Topic Label */}
                      {width > 50 && (
                        <span className="text-[10px] font-medium text-white/90 truncate">
                          {segment.topic || "..."}
                        </span>
                      )}

                      {/* Interest Icon */}
                      {width > 25 && segment.interestScore !== null && (
                        <span className="flex items-center">
                          {segment.interestScore >= 8 ? (
                            <Flame className="h-3 w-3 text-orange-400" fill="currentColor" />
                          ) : segment.interestScore >= 5 ? (
                            <Star className="h-3 w-3 text-amber-400/80" fill="currentColor" />
                          ) : (
                            <Minus className="h-2.5 w-2.5 text-zinc-500" />
                          )}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Playhead - positioned at container level to show time label above */}
            {playheadPosition !== null && (
              <motion.div
                className="absolute top-0 w-0.5 bg-red-500 z-30 pointer-events-none"
                style={{
                  left: `${playheadPosition}px`,
                  height: "100%",
                }}
                animate={{ left: `${playheadPosition}px` }}
                transition={{ duration: 0.1 }}
              >
                {/* Triangle marker at top of segments track */}
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-red-500" />
                {/* Time label - positioned inside the time ruler area */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-red-500 px-1.5 py-0.5 rounded text-[9px] text-white font-mono whitespace-nowrap">
                  {formatTime(currentTime)}
                </div>
              </motion.div>
            )}

            {/* Mode Info */}
            <div className="absolute bottom-1 left-2 text-[8px] text-zinc-600">
              {mode === "full" ? "Original" : mode === "edited" ? "Editada" : "Preview"} • {displaySegments.length} seg
            </div>
          </div>
        </div>

        {/* Compact Legend (only show when range selecting) */}
        {isRangeSelecting && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border-t border-blue-500/30 text-[10px]">
            <MousePointer2 className="h-3 w-3 text-blue-400 animate-pulse" />
            <span className="text-blue-400">Selecionando range...</span>
          </div>
        )}

        {/* Segment Detail Modal */}
        <AnimatePresence>
          {selectedSegmentDetail && (
            <SegmentDetail
              segment={selectedSegmentDetail}
              isOpen={true}
              onClose={() => setSelectedSegmentDetail(null)}
              onToggleSelect={() => {
                onToggleSelect(selectedSegmentDetail.id);
                setSelectedSegmentDetail(null);
              }}
              onPlay={() => {
                const audio = audioRef.current;
                if (audio) {
                  audio.currentTime = selectedSegmentDetail.startTime;
                  audio.play();
                }
              }}
              formatTime={formatTime}
            />
          )}
        </AnimatePresence>

        {/* Add Confirmation Modal */}
        <AnimatePresence>
          {addConfirmSegment && (
            <AddConfirmModal
              segment={addConfirmSegment}
              isOpen={true}
              onClose={() => setAddConfirmSegment(null)}
              onConfirm={() => {
                onToggleSelect(addConfirmSegment.id);
              }}
              onPlay={() => {
                const audio = audioRef.current;
                if (audio) {
                  audio.currentTime = addConfirmSegment.startTime;
                  audio.play();
                }
              }}
              formatTime={formatTime}
            />
          )}
        </AnimatePresence>

        {/* Range Confirmation Modal */}
        <AnimatePresence>
          {rangeConfirmSegments.length > 0 && (
            <RangeConfirmModal
              segments={rangeConfirmSegments}
              isOpen={true}
              onClose={() => setRangeConfirmSegments([])}
              onConfirm={() => {
                if (onSelectRange) {
                  onSelectRange(rangeConfirmSegments.map(s => s.id), true);
                }
              }}
              formatTime={formatTime}
            />
          )}
        </AnimatePresence>

        {/* Tooltip Portal - renders outside the overflow container */}
        {typeof document !== 'undefined' && hoveredSegment && tooltipPosition && !isRangeSelecting && createPortal(
          <AnimatePresence>
            {(() => {
              const segment = displaySegments.find(s => s.id === hoveredSegment);
              if (!segment) return null;
              return (
                <motion.div
                  key="tooltip"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                  className="fixed pointer-events-none -translate-x-1/2"
                  style={{
                    left: tooltipPosition.x,
                    bottom: `calc(100vh - ${tooltipPosition.y}px + 10px)`,
                    zIndex: 9999,
                  }}
                >
                  <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 rounded-lg px-3 py-2 shadow-xl max-w-[280px] min-w-[150px]">
                    {/* Topic */}
                    <div className="flex items-center gap-2 mb-1">
                      {segment.interestScore !== null && (
                        <span className="flex items-center">
                          {segment.interestScore >= 8 ? (
                            <Flame className="h-3 w-3 text-orange-400" fill="currentColor" />
                          ) : segment.interestScore >= 5 ? (
                            <Star className="h-3 w-3 text-amber-400" fill="currentColor" />
                          ) : (
                            <Minus className="h-2.5 w-2.5 text-zinc-500" />
                          )}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-white truncate">
                        {segment.topic || "Sem tópico"}
                      </span>
                    </div>
                    {/* Text preview */}
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {segment.text?.slice(0, 120)}{segment.text && segment.text.length > 120 ? "..." : ""}
                    </p>
                    {/* Time */}
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-500">
                      <span>{formatTime(segment.startTime)} - {formatTime(segment.endTime)}</span>
                      <span className="text-zinc-600">•</span>
                      <span>{formatTime(segment.endTime - segment.startTime)}</span>
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-zinc-700/80" />
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>,
          document.body
        )}
      </div>
    );
  }
);
