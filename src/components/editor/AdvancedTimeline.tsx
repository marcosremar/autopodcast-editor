"use client";

import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
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
  ChevronDown,
  ChevronUp,
  Clock,
  Tag,
  FileText,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdvancedTimelineRef {
  playSegment: (segment: Segment) => void;
  seekToTime: (time: number) => void;
  getCurrentTime: () => number;
}

interface AdvancedTimelineProps {
  segments: Segment[];
  audioUrl: string | null;
  onToggleSelect: (segmentId: string) => void;
  onUpdateSegment?: (segmentId: string, updates: Partial<Segment>) => void;
  className?: string;
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

export const AdvancedTimeline = forwardRef<AdvancedTimelineRef, AdvancedTimelineProps>(
  function AdvancedTimeline({ segments, audioUrl, onToggleSelect, onUpdateSegment, className }, ref) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [zoom, setZoom] = useState(1); // 1 = normal, 2 = 2x zoom, etc.
    const [scrollLeft, setScrollLeft] = useState(0);
    const [selectedSegmentDetail, setSelectedSegmentDetail] = useState<Segment | null>(null);
    const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

    // Calculate dimensions
    const totalDuration = segments.length > 0
      ? Math.max(...segments.map((s) => s.endTime))
      : 0;

    const pixelsPerSecond = 10 * zoom; // Base: 10px per second
    const timelineWidth = totalDuration * pixelsPerSecond;
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
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left + scrollLeft;
      const clickTime = clickX / pixelsPerSecond;
      seekTo(clickTime);
    };

    const getSegmentColor = (segment: Segment) => {
      if (segment.isSelected) return "bg-emerald-500";
      const analysis = segment.analysis as SegmentAnalysis | null;
      if (analysis?.hasFactualError || analysis?.hasContradiction) return "bg-red-500";
      if (analysis?.isTangent) return "bg-amber-500";
      if (analysis?.isRepetition) return "bg-yellow-500";
      if ((segment.interestScore || 0) < 5) return "bg-zinc-600";
      return "bg-blue-500";
    };

    const getSegmentBorderColor = (segment: Segment) => {
      if (segment.isSelected) return "border-emerald-400";
      return "border-transparent";
    };

    // Generate time markers
    const timeMarkers = [];
    const markerInterval = zoom >= 2 ? 10 : zoom >= 1 ? 30 : 60; // seconds between markers
    for (let t = 0; t <= totalDuration; t += markerInterval) {
      timeMarkers.push(t);
    }

    // Stats
    const selectedSegments = segments.filter(s => s.isSelected);
    const selectedDuration = selectedSegments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
    const reduction = totalDuration > 0 ? Math.round((1 - selectedDuration / totalDuration) * 100) : 0;

    return (
      <div className={cn("bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden", className)}>
        <audio ref={audioRef} src={audioUrl || undefined} />

        {/* Header with Stats */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs text-zinc-500 uppercase mb-1">Original</div>
              <div className="text-lg font-bold text-white">{formatTime(totalDuration)}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 uppercase mb-1">Editado</div>
              <div className="text-lg font-bold text-emerald-400">{formatTime(selectedDuration)}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 uppercase mb-1">Reducao</div>
              <div className="text-lg font-bold text-amber-400">-{reduction}%</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 uppercase mb-1">Segmentos</div>
              <div className="text-lg font-bold text-purple-400">
                {selectedSegments.length}
                <span className="text-zinc-600 text-sm">/{segments.length}</span>
              </div>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 mr-2">Zoom: {zoom}x</span>
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.5))}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => setZoom(Math.min(4, zoom + 0.5))}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex items-center gap-4 p-4 border-b border-zinc-800 bg-zinc-900/50">
          <button
            onClick={() => seekTo(currentTime - 10)}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <SkipBack className="h-5 w-5" />
          </button>

          <button
            onClick={togglePlay}
            className="h-12 w-12 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center transition-colors shadow-lg shadow-emerald-500/30"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 text-white" fill="currentColor" />
            ) : (
              <Play className="h-5 w-5 text-white ml-0.5" fill="currentColor" />
            )}
          </button>

          <button
            onClick={() => seekTo(currentTime + 10)}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <SkipForward className="h-5 w-5" />
          </button>

          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.muted = !isMuted;
                setIsMuted(!isMuted);
              }
            }}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          <div className="flex-1 flex items-center gap-3">
            <span className="text-sm font-mono text-white w-14">{formatTime(currentTime)}</span>
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${(currentTime / totalDuration) * 100}%` }}
              />
            </div>
            <span className="text-sm font-mono text-zinc-500 w-14">{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Timeline */}
        <div
          ref={timelineRef}
          className="overflow-x-auto overflow-y-hidden"
          onScroll={handleScroll}
        >
          <div
            className="relative"
            style={{ width: `${Math.max(timelineWidth, containerWidth)}px`, minHeight: "200px" }}
            onClick={handleTimelineClick}
          >
            {/* Time Ruler */}
            <div className="h-8 bg-zinc-800/50 border-b border-zinc-700 relative">
              {timeMarkers.map((t) => (
                <div
                  key={t}
                  className="absolute top-0 h-full flex flex-col items-center"
                  style={{ left: `${t * pixelsPerSecond}px` }}
                >
                  <div className="h-3 w-px bg-zinc-600" />
                  <span className="text-[10px] text-zinc-500 mt-1">{formatTime(t)}</span>
                </div>
              ))}
            </div>

            {/* Segments Track */}
            <div className="relative h-32 bg-zinc-950">
              {segments.map((segment) => {
                const left = segment.startTime * pixelsPerSecond;
                const width = (segment.endTime - segment.startTime) * pixelsPerSecond;
                const analysis = segment.analysis as SegmentAnalysis | null;
                const isHovered = hoveredSegment === segment.id;

                return (
                  <motion.div
                    key={segment.id}
                    className={cn(
                      "absolute top-2 rounded-lg cursor-pointer transition-all border-2",
                      getSegmentColor(segment),
                      getSegmentBorderColor(segment),
                      segment.isSelected ? "opacity-100" : "opacity-60 hover:opacity-80",
                      isHovered && "ring-2 ring-white/30"
                    )}
                    style={{
                      left: `${left}px`,
                      width: `${Math.max(width, 30)}px`,
                      height: "calc(100% - 16px)",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSegmentDetail(segment);
                    }}
                    onMouseEnter={() => setHoveredSegment(segment.id)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    whileHover={{ y: -2 }}
                  >
                    {/* Segment Content */}
                    <div className="p-2 h-full flex flex-col overflow-hidden">
                      {/* Topic Label */}
                      {width > 80 && (
                        <div className="flex items-center gap-1 mb-1">
                          <Tag className="h-3 w-3 text-white/70" />
                          <span className="text-xs font-medium text-white truncate">
                            {segment.topic || "Sem topico"}
                          </span>
                        </div>
                      )}

                      {/* Summary/Preview */}
                      {width > 120 && (
                        <p className="text-[10px] text-white/60 line-clamp-2 flex-1">
                          {analysis?.keyInsight || segment.text.substring(0, 100)}
                        </p>
                      )}

                      {/* Score Badge */}
                      {width > 50 && segment.interestScore !== null && (
                        <div className={cn(
                          "absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                          "bg-black/30 text-white"
                        )}>
                          {segment.interestScore}
                        </div>
                      )}

                      {/* Selection indicator */}
                      {segment.isSelected && (
                        <div className="absolute top-1 right-1">
                          <Check className="h-4 w-4 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Playhead */}
              <motion.div
                className="absolute top-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                style={{
                  left: `${currentTime * pixelsPerSecond}px`,
                  height: "100%",
                }}
                animate={{ left: `${currentTime * pixelsPerSecond}px` }}
                transition={{ duration: 0.1 }}
              >
                {/* Playhead Triangle */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-red-500" />
                {/* Time indicator */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-red-500 px-2 py-0.5 rounded text-[10px] text-white font-mono whitespace-nowrap">
                  {formatTime(currentTime)}
                </div>
              </motion.div>
            </div>

            {/* Selected Segments Track (shows only selected in order) */}
            <div className="relative h-16 bg-zinc-900 border-t border-zinc-800">
              <div className="absolute left-2 top-2 text-[10px] text-zinc-500 uppercase">
                Versao Editada
              </div>
              <div className="absolute top-6 left-0 right-0 h-8 flex">
                {selectedSegments
                  .sort((a, b) => a.startTime - b.startTime)
                  .map((segment, index) => {
                    const segDuration = segment.endTime - segment.startTime;
                    const width = (segDuration / selectedDuration) * 100;

                    return (
                      <div
                        key={segment.id}
                        className="h-full bg-emerald-500 border-r border-emerald-600 last:border-r-0 flex items-center justify-center overflow-hidden"
                        style={{ width: `${width}%` }}
                      >
                        {width > 5 && (
                          <span className="text-[10px] text-white truncate px-1">
                            {segment.topic || `${index + 1}`}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 p-3 bg-zinc-800/30 border-t border-zinc-800 text-xs">
          <span className="text-zinc-500">Legenda:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-zinc-400">Selecionado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-zinc-400">Bom</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span className="text-zinc-400">Tangente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span className="text-zinc-400">Repetido</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-zinc-400">Erro</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-zinc-600" />
            <span className="text-zinc-400">Baixo interesse</span>
          </div>
          <span className="text-zinc-600 ml-auto">Clique em um segmento para ver detalhes</span>
        </div>

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
      </div>
    );
  }
);
