"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Segment, SegmentAnalysis } from "@/lib/db/schema";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Check,
  Clock,
  Scissors,
  ListMusic,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HorizontalTimelineProps {
  segments: Segment[];
  audioUrl: string | null;
  onToggleSelect: (segmentId: string) => void;
  className?: string;
}

export function HorizontalTimeline({
  segments,
  audioUrl,
  onToggleSelect,
  className,
}: HorizontalTimelineProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [editedSegmentIndex, setEditedSegmentIndex] = useState(0);
  const [editedTime, setEditedTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // Filter categories
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

  const selectedSegments = segments
    .filter((s) => s.isSelected)
    .sort((a, b) => a.startTime - b.startTime);

  const originalDuration = segments.length > 0
    ? Math.max(...segments.map((s) => s.endTime))
    : 0;

  const editedDuration = selectedSegments.reduce(
    (sum, seg) => sum + (seg.endTime - seg.startTime),
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

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);

      // Calculate edited time and check if we need to jump to next segment
      const currentSeg = selectedSegments[editedSegmentIndex];
      if (currentSeg) {
        if (time >= currentSeg.endTime) {
          // Move to next segment
          const nextIndex = editedSegmentIndex + 1;
          if (nextIndex < selectedSegments.length) {
            setEditedSegmentIndex(nextIndex);
            audio.currentTime = selectedSegments[nextIndex].startTime;
          } else {
            // End of edited version
            audio.pause();
            setIsPlaying(false);
            setEditedSegmentIndex(0);
            setEditedTime(0);
          }
        } else if (time >= currentSeg.startTime) {
          // Update edited time
          let elapsed = 0;
          for (let i = 0; i < editedSegmentIndex; i++) {
            elapsed += selectedSegments[i].endTime - selectedSegments[i].startTime;
          }
          elapsed += time - currentSeg.startTime;
          setEditedTime(elapsed);
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

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
  }, [selectedSegments, editedSegmentIndex]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || selectedSegments.length === 0) return;

    if (isPlaying) {
      audio.pause();
    } else {
      // Make sure we're at the right position
      const currentSeg = selectedSegments[editedSegmentIndex];
      if (currentSeg) {
        if (audio.currentTime < currentSeg.startTime || audio.currentTime >= currentSeg.endTime) {
          audio.currentTime = currentSeg.startTime;
        }
      }
      audio.play();
    }
  };

  const playFromStart = () => {
    const audio = audioRef.current;
    if (!audio || selectedSegments.length === 0) return;

    setEditedSegmentIndex(0);
    setEditedTime(0);
    audio.currentTime = selectedSegments[0].startTime;
    audio.play();
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

  const playSegmentPreview = (segment: Segment) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = segment.startTime;
    audio.play();

    // Stop at end of segment
    const stopAtEnd = () => {
      if (audio.currentTime >= segment.endTime) {
        audio.pause();
        audio.removeEventListener("timeupdate", stopAtEnd);
      }
    };
    audio.addEventListener("timeupdate", stopAtEnd);
  };

  const getSegmentStatus = (segment: Segment) => {
    const analysis = segment.analysis as SegmentAnalysis | null;
    if (analysis?.isTangent) return "tangent";
    if (analysis?.isRepetition) return "repetition";
    if (analysis?.hasFactualError || analysis?.hasContradiction) return "error";
    if ((segment.interestScore || 0) < 5) return "low-interest";
    return "good";
  };

  const getSegmentColor = (segment: Segment, isSelected: boolean) => {
    if (isSelected) return "bg-emerald-500";
    const status = getSegmentStatus(segment);
    switch (status) {
      case "tangent": return "bg-amber-500";
      case "repetition": return "bg-yellow-500";
      case "error": return "bg-red-500";
      case "low-interest": return "bg-zinc-600";
      default: return "bg-blue-500";
    }
  };

  const getStatusLabel = (segment: Segment) => {
    const analysis = segment.analysis as SegmentAnalysis | null;
    if (analysis?.isTangent) return "Tangente";
    if (analysis?.isRepetition) return "Repetido";
    if (analysis?.hasFactualError) return "Erro factual";
    if (analysis?.hasContradiction) return "Contradiz";
    if ((segment.interestScore || 0) < 5) return "Baixo interesse";
    return "OK";
  };

  // Calculate playhead position on edited timeline
  const editedProgress = editedDuration > 0 ? (editedTime / editedDuration) * 100 : 0;

  return (
    <div className={cn("bg-zinc-950 rounded-2xl overflow-hidden", className)}>
      {/* Stats Header */}
      <div className="grid grid-cols-4 gap-px bg-zinc-800">
        <div className="bg-zinc-900 p-5 text-center">
          <div className="text-3xl font-bold text-white tracking-tight">
            {formatTime(originalDuration)}
          </div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Original</div>
        </div>
        <div className="bg-zinc-900 p-5 text-center">
          <div className="text-3xl font-bold text-emerald-400 tracking-tight">
            {formatTime(editedDuration)}
          </div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Editado</div>
        </div>
        <div className="bg-zinc-900 p-5 text-center">
          <div className="text-3xl font-bold text-amber-400 tracking-tight">
            -{reduction}%
          </div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Reducao</div>
        </div>
        <div className="bg-zinc-900 p-5 text-center">
          <div className="text-3xl font-bold text-purple-400 tracking-tight">
            {selectedSegments.length}
            <span className="text-lg text-zinc-600">/{segments.length}</span>
          </div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Segmentos</div>
        </div>
      </div>

      {/* Original Timeline (Visual Only - for selection) */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-400">Timeline Original</span>
          <span className="text-xs text-zinc-600 ml-auto">Clique para selecionar/remover segmentos</span>
        </div>

        <div className="relative h-16 bg-zinc-900 rounded-lg overflow-hidden">
          {segments.map((segment) => {
            const width = ((segment.endTime - segment.startTime) / originalDuration) * 100;
            const isSelected = segment.isSelected ?? false;

            return (
              <motion.div
                key={segment.id}
                className={cn(
                  "absolute top-0 h-full cursor-pointer transition-all border-r border-zinc-950",
                  getSegmentColor(segment, isSelected),
                  !isSelected && "opacity-30 hover:opacity-50",
                  isSelected && "opacity-100 hover:opacity-80"
                )}
                style={{
                  left: `${(segment.startTime / originalDuration) * 100}%`,
                  width: `${Math.max(width, 0.3)}%`,
                }}
                onClick={() => onToggleSelect(segment.id)}
                whileHover={{ y: -2 }}
                title={`${formatTime(segment.startTime)} - ${segment.topic || "Segmento"}`}
              >
                {width > 2 && (
                  <div className="absolute top-1 right-1">
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="flex justify-between text-xs text-zinc-600 mt-1">
          <span>0:00</span>
          <span>{formatTime(originalDuration / 2)}</span>
          <span>{formatTime(originalDuration)}</span>
        </div>
      </div>

      {/* Player + Edited Timeline */}
      <div className="p-6 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <audio ref={audioRef} src={audioUrl || undefined} />

        <div className="flex items-center gap-2 mb-4">
          <Scissors className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-medium text-emerald-400">Player - Versao Editada</span>
        </div>

        {selectedSegments.length === 0 ? (
          <div className="h-24 rounded-xl border border-dashed border-zinc-700 flex items-center justify-center text-zinc-500">
            Selecione segmentos na timeline acima para criar a versao editada
          </div>
        ) : (
          <>
            {/* Edited Timeline with Playhead - Clickable to seek */}
            <div
              className="relative h-14 bg-zinc-800 rounded-xl overflow-hidden mb-4 cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickPercent = clickX / rect.width;
                const targetEditedTime = clickPercent * editedDuration;

                // Find which segment this time falls into
                let accumulatedTime = 0;
                for (let i = 0; i < selectedSegments.length; i++) {
                  const seg = selectedSegments[i];
                  const segDur = seg.endTime - seg.startTime;
                  if (accumulatedTime + segDur > targetEditedTime) {
                    // This is the segment
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
                      isCurrent ? "opacity-100" : "opacity-70"
                    )}
                    style={{
                      left: `${selectedSegments.slice(0, index).reduce((sum, s) => sum + ((s.endTime - s.startTime) / editedDuration) * 100, 0)}%`,
                      width: `${width}%`,
                    }}
                  >
                    {width > 5 && (
                      <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium truncate px-1">
                        {segment.topic || `Seg ${index + 1}`}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Playhead */}
              <motion.div
                className="absolute top-0 w-1 h-full bg-white rounded-full shadow-lg shadow-white/30 z-10 pointer-events-none"
                style={{ left: `${editedProgress}%` }}
                animate={{ left: `${editedProgress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>

            {/* Time display */}
            <div className="flex justify-between text-xs text-zinc-500 mb-4">
              <span className="font-mono">{formatTime(editedTime)}</span>
              <span className="text-emerald-400">
                {selectedSegments[editedSegmentIndex]?.topic || ""}
              </span>
              <span className="font-mono">{formatTime(editedDuration)}</span>
            </div>

            {/* Player Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={skipToPrevSegment}
                disabled={editedSegmentIndex === 0}
                className="p-3 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <SkipBack className="h-5 w-5" />
              </button>

              <button
                onClick={togglePlay}
                className="h-16 w-16 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-emerald-400 hover:scale-105 transition-all shadow-lg shadow-emerald-500/30"
              >
                {isPlaying ? (
                  <Pause className="h-7 w-7 text-white" fill="currentColor" />
                ) : (
                  <Play className="h-7 w-7 text-white ml-1" fill="currentColor" />
                )}
              </button>

              <button
                onClick={skipToNextSegment}
                disabled={editedSegmentIndex >= selectedSegments.length - 1}
                className="p-3 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <SkipForward className="h-5 w-5" />
              </button>

              <button
                onClick={toggleMute}
                className="p-3 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all ml-4"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>

            {/* Segment counter */}
            <div className="text-center text-xs text-zinc-500 mt-4">
              Segmento {editedSegmentIndex + 1} de {selectedSegments.length}
            </div>
          </>
        )}
      </div>

      {/* Segment List */}
      <div className="border-t border-zinc-800">
        <div className="p-4 border-b border-zinc-800">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <ListMusic className="h-4 w-4 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-400">Todos os Segmentos</span>
            <span className="ml-auto text-xs text-zinc-600">{segments.length} segmentos</span>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por texto, topico..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-10 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Chips */}
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
            {activeFilters.length > 0 && (
              <button
                onClick={() => setActiveFilters([])}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-all"
              >
                <X className="h-3 w-3" />
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {segments
            .filter((segment) => {
              // Search filter
              if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesText = segment.text.toLowerCase().includes(query);
                const matchesTopic = (segment.topic || "").toLowerCase().includes(query);
                if (!matchesText && !matchesTopic) return false;
              }

              // Category filter
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
              <motion.div
                key={segment.id}
                className={cn(
                  "flex items-center gap-4 p-4 border-b border-zinc-800/50 cursor-pointer transition-colors group",
                  isSelected
                    ? "bg-emerald-500/10 hover:bg-emerald-500/15"
                    : "hover:bg-zinc-900"
                )}
                onClick={() => playSegmentPreview(segment)}
                whileTap={{ scale: 0.99 }}
              >
                {/* Checkbox - clique separado */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(segment.id);
                  }}
                  className={cn(
                    "h-6 w-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                    isSelected
                      ? "bg-emerald-500 border-emerald-500 hover:bg-emerald-600"
                      : "border-zinc-600 hover:border-emerald-500 hover:bg-emerald-500/20"
                  )}
                  title={isSelected ? "Remover da edicao" : "Adicionar a edicao"}
                >
                  {isSelected && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                </button>

                {/* Play indicator */}
                <div className="w-8 h-8 rounded-full bg-zinc-800 group-hover:bg-emerald-500 flex items-center justify-center shrink-0 transition-colors">
                  <Play className="h-3 w-3 text-zinc-400 group-hover:text-white ml-0.5" fill="currentColor" />
                </div>

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
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-4 bg-zinc-900/50 border-t border-zinc-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-emerald-500" />
          <span className="text-zinc-400">Selecionado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-amber-500" />
          <span className="text-zinc-400">Tangente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-yellow-500" />
          <span className="text-zinc-400">Repeticao</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-red-500" />
          <span className="text-zinc-400">Erro</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-zinc-600" />
          <span className="text-zinc-400">Baixo Interesse</span>
        </div>
      </div>
    </div>
  );
}
