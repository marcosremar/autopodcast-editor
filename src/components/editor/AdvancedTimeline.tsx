"use client";

import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle, useMemo } from "react";
import { motion } from "framer-motion";
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
  X,
  Eye,
  Repeat,
  Scissors,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdvancedTimelineRef {
  playSegment: (segment: Segment) => void;
  seekToTime: (time: number) => void;
  seekTo: (time: number) => void; // Alias for seekToTime
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
  waveformPeaks?: number[]; // Real waveform data from audio analysis
  onToggleSelect: (segmentId: string) => void;
  onSelectRange?: (segmentIds: string[], select: boolean) => void;
  onUpdateSegment?: (segmentId: string, updates: Partial<Segment>) => void;
  onSegmentClick?: (segmentId: string) => void;
  className?: string;
  initialMode?: TimelineMode;
  previewRange?: PreviewRange;
  onPreviewClose?: () => void;
  onTimeUpdate?: (time: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
}

export const AdvancedTimeline = forwardRef<AdvancedTimelineRef, AdvancedTimelineProps>(
  function AdvancedTimeline({ segments, audioUrl, waveformPeaks, onToggleSelect, onSelectRange, onUpdateSegment, onSegmentClick, className, initialMode = "full", previewRange, onPreviewClose, onTimeUpdate, onPlayingChange }, ref) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
    const [mode, setMode] = useState<TimelineMode>(initialMode);
    const [previewLoop, setPreviewLoop] = useState(false); // Loop mode for preview

    // Scrubbing state (dragging on ruler)
    const [isScrubbing, setIsScrubbing] = useState(false);
    const rulerRef = useRef<HTMLDivElement>(null);

    // Auto-switch to preview mode when previewRange is provided
    useEffect(() => {
      if (previewRange && previewRange.segmentIds.length > 0) {
        console.log("[Timeline] Switching to preview mode with segments:", previewRange.segmentIds);
        setMode("preview");

        // Scroll to first focused segment
        const firstFocusedSegmentId = previewRange.segmentIds[0];
        const firstSegment = segments.find(s => s.id === firstFocusedSegmentId);

        if (firstSegment && timelineRef.current) {
          console.log("[Timeline] Scrolling to segment:", firstSegment.id, "at time:", firstSegment.startTime);

          // Small delay to ensure preview mode is rendered
          setTimeout(() => {
            const segmentElement = timelineRef.current?.querySelector(`[data-segment-id="${firstSegment.id}"]`);
            if (segmentElement) {
              console.log("[Timeline] Found segment element, scrolling...");
              segmentElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "center"
              });

              // Also scroll the timeline container if it exists
              const scrollContainer = timelineRef.current?.querySelector('.overflow-x-auto');
              if (scrollContainer) {
                const segmentRect = segmentElement.getBoundingClientRect();
                const containerRect = scrollContainer.getBoundingClientRect();
                const scrollLeft = segmentRect.left - containerRect.left + scrollContainer.scrollLeft - (containerRect.width / 2);

                scrollContainer.scrollTo({
                  left: scrollLeft,
                  behavior: 'smooth'
                });
              }
            } else {
              console.log("[Timeline] Segment element not found!");
            }
          }, 100);
        } else {
          console.log("[Timeline] First segment not found or timelineRef is null");
        }
      } else if (!previewRange) {
        console.log("[Timeline] Preview range cleared, returning to full mode");
      }
    }, [previewRange, segments]);

    // Get segments based on mode
    const displaySegments = mode === "edited"
      ? segments.filter(s => s.isSelected).sort((a, b) => a.startTime - b.startTime)
      : segments; // In preview mode, show ALL segments (will be dimmed if not in preview)

    // Helper to check if segment is in preview focus
    const isInPreviewFocus = (segmentId: string): boolean => {
      if (mode !== "preview" || !previewRange) return true;
      return previewRange.segmentIds.includes(segmentId);
    };

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
      seekTo: (time: number) => {
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

      const handleTimeUpdate = () => {
        const currentTime = audio.currentTime;
        setCurrentTime(currentTime);
        onTimeUpdate?.(currentTime);

        // Preview mode playback restrictions
        if (mode === "preview" && previewRange && previewRange.segmentIds.length > 0) {
          const previewSegments = segments.filter(s => previewRange.segmentIds.includes(s.id));
          if (previewSegments.length > 0) {
            // Calculate time range for preview segments
            const minTime = Math.min(...previewSegments.map(s => s.startTime));
            const maxTime = Math.max(...previewSegments.map(s => s.endTime));

            // If playback goes beyond preview range
            if (currentTime < minTime || currentTime > maxTime) {
              if (previewLoop) {
                // Loop back to start
                audio.currentTime = minTime;
                console.log("[Timeline] Preview loop - jumping to start:", minTime);
              } else {
                // Stop playback
                audio.pause();
                audio.currentTime = minTime;
                console.log("[Timeline] Preview ended - stopping at:", minTime);
              }
            }
          }
        }
      };

      const handleLoadedMetadata = () => setDuration(audio.duration);
      const handlePlay = () => {
        setIsPlaying(true);
        onPlayingChange?.(true);
      };
      const handlePause = () => {
        setIsPlaying(false);
        onPlayingChange?.(false);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        // If preview mode with loop enabled, restart
        if (mode === "preview" && previewLoop && previewRange && previewRange.segmentIds.length > 0) {
          const previewSegments = segments.filter(s => previewRange.segmentIds.includes(s.id));
          if (previewSegments.length > 0) {
            const minTime = Math.min(...previewSegments.map(s => s.startTime));
            audio.currentTime = minTime;
            audio.play();
            console.log("[Timeline] Preview loop on ended - restarting from:", minTime);
          }
        }
      };

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
    }, [mode, previewRange, previewLoop, segments]);

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

    // Handle segment click - navigate to description below
    const handleSegmentClick = (e: React.MouseEvent, segmentId: string) => {
      e.preventDefault();
      e.stopPropagation();
      onSegmentClick?.(segmentId);
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

    // Calculate gaps between segments (areas where content was removed)
    interface Gap {
      startTime: number;
      endTime: number;
      duration: number;
    }

    const gaps = useMemo<Gap[]>(() => {
      if (mode !== "full" && mode !== "preview") return []; // Only show gaps in full/preview mode
      if (displaySegments.length === 0) return [];

      const sortedSegments = [...displaySegments].sort((a, b) => a.startTime - b.startTime);
      const calculatedGaps: Gap[] = [];

      for (let i = 0; i < sortedSegments.length - 1; i++) {
        const currentSegment = sortedSegments[i];
        const nextSegment = sortedSegments[i + 1];
        const gapStart = currentSegment.endTime;
        const gapEnd = nextSegment.startTime;
        const gapDuration = gapEnd - gapStart;

        // Only show gaps that are at least 0.5 second (to filter out tiny rounding errors)
        if (gapDuration >= 0.5) {
          calculatedGaps.push({
            startTime: gapStart,
            endTime: gapEnd,
            duration: gapDuration,
          });
        }
      }

      return calculatedGaps;
    }, [displaySegments, mode]);

    // Calculate segment position for edited mode
    const getSegmentPosition = (segment: Segment, index: number) => {
      // In preview mode, use full timeline positioning (time-based)
      // so all segments appear in their correct positions
      if (mode === "full" || mode === "preview") {
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
      // In full or preview mode, use time-based positioning
      if (mode === "full" || mode === "preview") {
        return currentTime * pixelsPerSecond;
      }

      // For edited mode, find which segment contains the current time
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

              {/* Loop Toggle Button */}
              <button
                onClick={() => setPreviewLoop(!previewLoop)}
                className={cn(
                  "p-0.5 rounded transition-all",
                  previewLoop
                    ? "bg-violet-500 text-white shadow-lg shadow-violet-500/50"
                    : "hover:bg-violet-500/30 text-violet-400 hover:text-white"
                )}
                title={previewLoop ? "Loop ativado - clique para desativar" : "Loop desativado - clique para repetir"}
              >
                <Repeat className={cn("h-3 w-3", previewLoop && "animate-pulse")} />
              </button>

              {onPreviewClose && (
                <button
                  onClick={() => {
                    setMode("full");
                    setPreviewLoop(false); // Reset loop when closing preview
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
              {/* Gap Indicators */}
              {gaps.map((gap, index) => {
                const gapWidth = gap.duration * pixelsPerSecond;
                const gapLeft = gap.startTime * pixelsPerSecond;

                // Only render if gap is visible (min 4px width)
                if (gapWidth < 4) return null;

                return (
                  <div
                    key={`gap-${index}`}
                    className="absolute top-1/2 -translate-y-1/2 z-5"
                    style={{
                      left: `${gapLeft}px`,
                      width: `${gapWidth}px`,
                    }}
                  >
                    {/* Gap Visual - Striped Pattern */}
                    <div
                      className="h-8 rounded border border-dashed border-zinc-600/40 bg-zinc-800/30"
                      style={{
                        backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(113, 113, 122, 0.15) 4px, rgba(113, 113, 122, 0.15) 8px)",
                      }}
                    >
                      {/* Gap Label - only show if wide enough */}
                      {gapWidth > 40 && (
                        <div className="h-full flex items-center justify-center gap-1">
                          <Scissors className="h-3 w-3 text-zinc-500" />
                          {gapWidth > 60 && (
                            <span className="text-[9px] font-medium text-zinc-500">
                              {formatTime(gap.duration)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Segments */}
              {displaySegments.map((segment, index) => {
                const { left, width } = getSegmentPosition(segment, index);
                const isHovered = hoveredSegment === segment.id;
                const inFocus = isInPreviewFocus(segment.id);

                return (
                  <motion.div
                    key={segment.id}
                    data-segment-id={segment.id}
                    className={cn(
                      "absolute rounded cursor-pointer border select-none shadow-sm transition-all duration-300",
                      getSegmentColor(segment),
                      getSegmentBorderColor(segment),
                      segment.isSelected ? "opacity-100" : "opacity-70",
                      // Preview focus styling - dim segments not in focus
                      !inFocus && "opacity-30 grayscale",
                      inFocus && mode === "preview" && "ring-2 ring-violet-500/50 shadow-lg shadow-violet-500/20",
                      isHovered && "ring-1 ring-white/30 shadow-md shadow-black/30 z-20"
                    )}
                    style={{
                      left: `${left + 1}px`,
                      width: `${Math.max(width - 2, 4)}px`,
                    }}
                    initial={false}
                    animate={{
                      top: isHovered ? 2 : 4,
                      height: isHovered ? "calc(100% - 4px)" : "calc(100% - 8px)",
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                      mass: 0.3
                    }}
                    onClick={(e) => handleSegmentClick(e, segment.id)}
                    onMouseEnter={() => setHoveredSegment(segment.id)}
                    onMouseLeave={() => setHoveredSegment(null)}
                  >
                    {/* Wave Spectrum Background - Real or Fake */}
                    <div className="absolute inset-0 flex items-end justify-around px-0.5 pb-1 overflow-hidden opacity-60">
                      {(() => {
                        const numBars = Math.max(3, Math.min(Math.floor(width / 4), 30));

                        // Try to use real waveform data
                        if (waveformPeaks && waveformPeaks.length > 0 && totalDuration > 0) {
                          // Calculate which peaks correspond to this segment
                          const peaksPerSecond = waveformPeaks.length / totalDuration;
                          const startPeakIndex = Math.floor(segment.startTime * peaksPerSecond);
                          const endPeakIndex = Math.ceil(segment.endTime * peaksPerSecond);
                          const segmentPeaks = waveformPeaks.slice(startPeakIndex, endPeakIndex);

                          if (segmentPeaks.length > 0) {
                            // Resample to fit numBars
                            const peaksPerBar = segmentPeaks.length / numBars;
                            return Array.from({ length: numBars }).map((_, i) => {
                              const peakStart = Math.floor(i * peaksPerBar);
                              const peakEnd = Math.ceil((i + 1) * peaksPerBar);
                              // Get max peak value in this range
                              const barPeaks = segmentPeaks.slice(peakStart, peakEnd);
                              const maxPeak = barPeaks.length > 0
                                ? Math.max(...barPeaks)
                                : 0.3;
                              // Scale to 15-95% height
                              const height = 15 + maxPeak * 80;
                              return (
                                <div
                                  key={i}
                                  className={cn(
                                    "w-[2px] rounded-t-full transition-all",
                                    segment.isSelected
                                      ? "bg-emerald-300/70"
                                      : "bg-white/30"
                                  )}
                                  style={{ height: `${height}%` }}
                                />
                              );
                            });
                          }
                        }

                        // Fallback: Generate fake waveform
                        return Array.from({ length: numBars }).map((_, i) => {
                          const baseHeight = 30 + Math.sin(i * 0.8) * 20 + Math.cos(i * 1.2) * 15;
                          const height = Math.max(15, Math.min(85, baseHeight + (i % 3) * 10));
                          return (
                            <div
                              key={i}
                              className={cn(
                                "w-[2px] rounded-t-full",
                                segment.isSelected
                                  ? "bg-emerald-300/70"
                                  : "bg-white/30"
                              )}
                              style={{ height: `${height}%` }}
                            />
                          );
                        });
                      })()}
                    </div>
                    {/* Segment Content - Compact */}
                    <div className="relative px-1.5 py-1 h-full flex items-center overflow-hidden z-10">
                      {/* Topic Label */}
                      {width > 50 && (
                        <span className="text-[10px] font-medium text-white drop-shadow-sm truncate">
                          {segment.topic || "..."}
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

      </div>
    );
  }
);
