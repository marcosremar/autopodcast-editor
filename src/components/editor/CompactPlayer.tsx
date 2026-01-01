"use client";

import { useRef, useState, useEffect, useImperativeHandle, forwardRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Segment, TextCut } from "@/lib/db/schema";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Clock,
  Scissors,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CompactPlayerRef {
  playSegment: (segment: Segment) => void;
  playFromStart: () => void;
  seekToTime: (time: number) => void;
}

interface CompactPlayerProps {
  segments: Segment[];
  audioUrl: string | null;
  onToggleSelect: (segmentId: string) => void;
  className?: string;
}

export const CompactPlayer = forwardRef<CompactPlayerRef, CompactPlayerProps>(
  function CompactPlayer({ segments, audioUrl, onToggleSelect, className }, ref) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [editedSegmentIndex, setEditedSegmentIndex] = useState(0);
    const [editedTime, setEditedTime] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);

    const selectedSegments = segments
      .filter((s) => s.isSelected)
      .sort((a, b) => a.startTime - b.startTime);

    const originalDuration = segments.length > 0
      ? Math.max(...segments.map((s) => s.endTime))
      : 0;

    // Calculate edited duration accounting for text cuts
    const editedDuration = selectedSegments.reduce(
      (sum, seg) => {
        const cuts = (seg.textCuts as TextCut[]) || [];
        const cutDuration = cuts.reduce((s, c) => s + (c.endTime - c.startTime), 0);
        return sum + (seg.endTime - seg.startTime) - cutDuration;
      },
      0
    );

    const reduction = originalDuration > 0
      ? Math.round((1 - editedDuration / originalDuration) * 100)
      : 0;

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Get textCuts from a segment
    const getTextCuts = useCallback((segment: Segment): TextCut[] => {
      return (segment.textCuts as TextCut[]) || [];
    }, []);

    // Check if current time is inside a text cut and return the end time of that cut
    const checkAndSkipTextCuts = useCallback((time: number, segment: Segment, audio: HTMLAudioElement): boolean => {
      const cuts = getTextCuts(segment);
      for (const cut of cuts) {
        // If current time is within a cut range, skip to end of cut
        if (time >= cut.startTime && time < cut.endTime) {
          audio.currentTime = cut.endTime;
          return true;
        }
      }
      return false;
    }, [getTextCuts]);

    // Calculate effective segment duration (excluding text cuts)
    const getEffectiveDuration = useCallback((segment: Segment): number => {
      const cuts = getTextCuts(segment);
      const totalCutDuration = cuts.reduce((sum, cut) => sum + (cut.endTime - cut.startTime), 0);
      return (segment.endTime - segment.startTime) - totalCutDuration;
    }, [getTextCuts]);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      playSegment: (segment: Segment) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = segment.startTime;
        audio.play();

        const cuts = getTextCuts(segment);
        const handleSegmentTimeUpdate = () => {
          const time = audio.currentTime;

          // Skip over any text cuts
          for (const cut of cuts) {
            if (time >= cut.startTime && time < cut.endTime) {
              audio.currentTime = cut.endTime;
              return;
            }
          }

          // Stop at end of segment
          if (time >= segment.endTime) {
            audio.pause();
            audio.removeEventListener("timeupdate", handleSegmentTimeUpdate);
          }
        };
        audio.addEventListener("timeupdate", handleSegmentTimeUpdate);
      },
      playFromStart: () => {
        const audio = audioRef.current;
        if (!audio || selectedSegments.length === 0) return;
        setEditedSegmentIndex(0);
        setEditedTime(0);
        audio.currentTime = selectedSegments[0].startTime;
        audio.play();
      },
      seekToTime: (time: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = time;
      },
    }));

    // Audio event handlers
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const handleTimeUpdate = () => {
        const time = audio.currentTime;
        setCurrentTime(time);

        const currentSeg = selectedSegments[editedSegmentIndex];
        if (currentSeg) {
          // Check if we're inside a text cut and skip it
          if (checkAndSkipTextCuts(time, currentSeg, audio)) {
            return; // Will trigger another timeupdate after seeking
          }

          if (time >= currentSeg.endTime) {
            const nextIndex = editedSegmentIndex + 1;
            if (nextIndex < selectedSegments.length) {
              setEditedSegmentIndex(nextIndex);
              audio.currentTime = selectedSegments[nextIndex].startTime;
            } else {
              audio.pause();
              setIsPlaying(false);
              setEditedSegmentIndex(0);
              setEditedTime(0);
            }
          } else if (time >= currentSeg.startTime) {
            // Calculate elapsed time, accounting for text cuts
            let elapsed = 0;
            for (let i = 0; i < editedSegmentIndex; i++) {
              elapsed += getEffectiveDuration(selectedSegments[i]);
            }

            // For current segment, calculate time excluding cuts
            const cuts = getTextCuts(currentSeg);
            let timeInSegment = time - currentSeg.startTime;
            for (const cut of cuts) {
              if (time > cut.endTime) {
                // We've passed this cut entirely, subtract its duration
                timeInSegment -= (cut.endTime - cut.startTime);
              }
            }
            elapsed += Math.max(0, timeInSegment);
            setEditedTime(elapsed);
          }
        }
      };

      const handleLoadedMetadata = () => setDuration(audio.duration);
      const handleEnded = () => {
        setIsPlaying(false);
        setEditedSegmentIndex(0);
        setEditedTime(0);
      };
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("ended", handleEnded);
      audio.addEventListener("play", handlePlay);
      audio.addEventListener("pause", handlePause);

      return () => {
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("play", handlePlay);
        audio.removeEventListener("pause", handlePause);
      };
    }, [selectedSegments, editedSegmentIndex, checkAndSkipTextCuts, getTextCuts, getEffectiveDuration]);

    const togglePlay = () => {
      const audio = audioRef.current;
      if (!audio || selectedSegments.length === 0) return;

      if (isPlaying) {
        audio.pause();
      } else {
        const currentSeg = selectedSegments[editedSegmentIndex];
        if (currentSeg) {
          if (audio.currentTime < currentSeg.startTime || audio.currentTime >= currentSeg.endTime) {
            audio.currentTime = currentSeg.startTime;
          }
        }
        audio.play();
      }
    };

    const skipToPrevSegment = () => {
      if (editedSegmentIndex > 0) {
        const prevIndex = editedSegmentIndex - 1;
        setEditedSegmentIndex(prevIndex);
        if (audioRef.current) {
          audioRef.current.currentTime = selectedSegments[prevIndex].startTime;
        }
      }
    };

    const skipToNextSegment = () => {
      if (editedSegmentIndex < selectedSegments.length - 1) {
        const nextIndex = editedSegmentIndex + 1;
        setEditedSegmentIndex(nextIndex);
        if (audioRef.current) {
          audioRef.current.currentTime = selectedSegments[nextIndex].startTime;
        }
      }
    };

    const toggleMute = () => {
      if (audioRef.current) {
        audioRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
      }
    };

    const editedProgress = editedDuration > 0 ? (editedTime / editedDuration) * 100 : 0;

    return (
      <div className={cn("bg-zinc-900 rounded-xl border border-zinc-800", className)}>
        <audio ref={audioRef} src={audioUrl || undefined} />

        {/* Collapsed View */}
        <div className="p-3">
          {/* Stats Row */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-xs text-zinc-400">{formatTime(originalDuration)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Scissors className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs text-emerald-400">{formatTime(editedDuration)}</span>
            </div>
            <span className="text-xs text-amber-400">-{reduction}%</span>
            <span className="text-xs text-zinc-500 ml-auto">
              {selectedSegments.length}/{segments.length} seg
            </span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {/* Mini Timeline + Controls */}
          <div className="flex items-center gap-3">
            {/* Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={skipToPrevSegment}
                disabled={editedSegmentIndex === 0}
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <SkipBack className="h-4 w-4" />
              </button>

              <button
                onClick={togglePlay}
                disabled={selectedSegments.length === 0}
                className="h-9 w-9 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-emerald-400 disabled:bg-zinc-700 disabled:cursor-not-allowed transition-all"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 text-white" fill="currentColor" />
                ) : (
                  <Play className="h-4 w-4 text-white ml-0.5" fill="currentColor" />
                )}
              </button>

              <button
                onClick={skipToNextSegment}
                disabled={editedSegmentIndex >= selectedSegments.length - 1}
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>

            {/* Timeline */}
            <div className="flex-1">
              <div
                className="relative h-8 bg-zinc-800 rounded-lg overflow-hidden cursor-pointer"
                onClick={(e) => {
                  if (selectedSegments.length === 0) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const clickPercent = clickX / rect.width;
                  const targetEditedTime = clickPercent * editedDuration;

                  let accumulatedTime = 0;
                  for (let i = 0; i < selectedSegments.length; i++) {
                    const seg = selectedSegments[i];
                    const segDur = seg.endTime - seg.startTime;
                    if (accumulatedTime + segDur > targetEditedTime) {
                      const timeIntoSegment = targetEditedTime - accumulatedTime;
                      const audioTime = seg.startTime + timeIntoSegment;
                      setEditedSegmentIndex(i);
                      setEditedTime(targetEditedTime);
                      if (audioRef.current) {
                        audioRef.current.currentTime = audioTime;
                      }
                      break;
                    }
                    accumulatedTime += segDur;
                  }
                }}
              >
                {selectedSegments.map((segment, index) => {
                  const segDuration = segment.endTime - segment.startTime;
                  const width = (segDuration / editedDuration) * 100;
                  const isCurrent = index === editedSegmentIndex;

                  return (
                    <div
                      key={segment.id}
                      className={cn(
                        "absolute top-0 h-full bg-emerald-500 border-r border-emerald-600 last:border-r-0 transition-opacity",
                        isCurrent ? "opacity-100" : "opacity-60"
                      )}
                      style={{
                        left: `${selectedSegments.slice(0, index).reduce((sum, s) => sum + ((s.endTime - s.startTime) / editedDuration) * 100, 0)}%`,
                        width: `${width}%`,
                      }}
                    />
                  );
                })}

                {/* Playhead */}
                {selectedSegments.length > 0 && (
                  <motion.div
                    className="absolute top-0 w-0.5 h-full bg-white rounded-full shadow-lg shadow-white/30 z-10 pointer-events-none"
                    style={{ left: `${editedProgress}%` }}
                    animate={{ left: `${editedProgress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                )}
              </div>
            </div>

            {/* Time & Mute */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400 w-12 text-right">
                {formatTime(editedTime)}
              </span>
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Expanded View - Original Timeline */}
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-zinc-800 p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-zinc-500">Timeline Original - clique para selecionar</span>
            </div>

            <div className="relative h-10 bg-zinc-800 rounded-lg overflow-hidden">
              {segments.map((segment) => {
                const width = ((segment.endTime - segment.startTime) / originalDuration) * 100;
                const isSelected = segment.isSelected;

                return (
                  <div
                    key={segment.id}
                    className={cn(
                      "absolute top-0 h-full cursor-pointer transition-all border-r border-zinc-950",
                      isSelected ? "bg-emerald-500 opacity-100 hover:opacity-80" : "bg-zinc-600 opacity-40 hover:opacity-60"
                    )}
                    style={{
                      left: `${(segment.startTime / originalDuration) * 100}%`,
                      width: `${Math.max(width, 0.3)}%`,
                    }}
                    onClick={() => onToggleSelect(segment.id)}
                    title={`${formatTime(segment.startTime)} - ${segment.topic || "Segmento"}`}
                  />
                );
              })}
            </div>

            <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
              <span>0:00</span>
              <span>{formatTime(originalDuration)}</span>
            </div>
          </motion.div>
        )}
      </div>
    );
  }
);
