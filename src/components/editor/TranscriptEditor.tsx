"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Play,
  Check,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Segment, WordTimestamp } from "@/lib/db/schema";

interface TranscriptEditorProps {
  segments: Segment[];
  currentTime: number;
  onSeekTo: (time: number) => void;
  onSelectSegment: (segmentId: string) => void;
  className?: string;
}

export function TranscriptEditor({
  segments,
  currentTime,
  onSeekTo,
  onSelectSegment,
  className,
}: TranscriptEditorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<Map<string, HTMLSpanElement>>(new Map());

  // Sort segments by time
  const sortedSegments = useMemo(
    () => [...segments].sort((a, b) => a.startTime - b.startTime),
    [segments]
  );

  // Find current segment and word based on currentTime
  const currentSegmentIndex = useMemo(() => {
    return sortedSegments.findIndex(
      (seg) => currentTime >= seg.startTime && currentTime < seg.endTime
    );
  }, [sortedSegments, currentTime]);

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results: number[] = [];

    sortedSegments.forEach((segment, index) => {
      if (segment.text.toLowerCase().includes(query)) {
        results.push(index);
      }
    });

    setSearchResults(results);
    setCurrentResultIndex(0);
  }, [searchQuery, sortedSegments]);

  // Scroll to current segment during playback
  useEffect(() => {
    if (currentSegmentIndex >= 0) {
      const segment = sortedSegments[currentSegmentIndex];
      const element = document.getElementById(`segment-${segment.id}`);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [currentSegmentIndex, sortedSegments]);

  // Navigate search results
  const navigateResult = (direction: "prev" | "next") => {
    if (searchResults.length === 0) return;

    let newIndex;
    if (direction === "next") {
      newIndex = (currentResultIndex + 1) % searchResults.length;
    } else {
      newIndex =
        (currentResultIndex - 1 + searchResults.length) % searchResults.length;
    }

    setCurrentResultIndex(newIndex);

    // Scroll to result
    const segmentIndex = searchResults[newIndex];
    const segment = sortedSegments[segmentIndex];
    const element = document.getElementById(`segment-${segment.id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Highlight search query in text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-amber-500/40 text-white rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Handle word click (for word-level timestamps)
  const handleWordClick = (segment: Segment, wordIndex: number) => {
    const wordTimestamps = segment.wordTimestamps as WordTimestamp[] | null;
    if (wordTimestamps && wordTimestamps[wordIndex]) {
      onSeekTo(wordTimestamps[wordIndex].start);
    } else {
      // Fallback to segment start
      onSeekTo(segment.startTime);
    }
  };

  // Handle text selection for segment selection
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;

    // Find the segment element
    let element = container as HTMLElement;
    while (element && !element.id?.startsWith("segment-")) {
      element = element.parentElement as HTMLElement;
    }

    if (element) {
      const segmentId = element.id.replace("segment-", "");
      onSelectSegment(segmentId);
      selection.removeAllRanges();
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-zinc-900", className)}>
      {/* Search Bar */}
      <div className="p-3 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar na transcricao..."
            className="w-full pl-10 pr-20 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
          {searchQuery && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchResults.length > 0 && (
                <span className="text-xs text-zinc-500 mr-2">
                  {currentResultIndex + 1}/{searchResults.length}
                </span>
              )}
              <button
                onClick={() => navigateResult("prev")}
                disabled={searchResults.length === 0}
                className="p-1 text-zinc-400 hover:text-white disabled:opacity-50"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigateResult("next")}
                disabled={searchResults.length === 0}
                className="p-1 text-zinc-400 hover:text-white disabled:opacity-50"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSearchQuery("")}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Transcript */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4"
        onMouseUp={handleMouseUp}
      >
        {sortedSegments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText className="h-12 w-12 text-zinc-600 mb-4" />
            <p className="text-zinc-500">Nenhuma transcricao disponivel</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedSegments.map((segment, index) => {
              const isCurrentSegment = index === currentSegmentIndex;
              const isSearchResult = searchResults.includes(index);
              const isCurrentResult =
                isSearchResult && searchResults[currentResultIndex] === index;

              return (
                <motion.div
                  key={segment.id}
                  id={`segment-${segment.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    "group rounded-lg p-3 transition-all cursor-pointer",
                    isCurrentSegment
                      ? "bg-blue-500/20 border border-blue-500/30"
                      : isCurrentResult
                      ? "bg-amber-500/20 border border-amber-500/30"
                      : isSearchResult
                      ? "bg-amber-500/10"
                      : "hover:bg-zinc-800/50",
                    segment.isSelected && "border-l-4 border-l-emerald-500"
                  )}
                  onClick={() => onSeekTo(segment.startTime)}
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeekTo(segment.startTime);
                      }}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      <Play className="h-3 w-3" />
                      {formatTime(segment.startTime)}
                    </button>
                    {segment.topic && (
                      <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded">
                        {segment.topic}
                      </span>
                    )}
                    {segment.isSelected && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <Check className="h-3 w-3" />
                        Selecionado
                      </span>
                    )}
                  </div>

                  {/* Text */}
                  <p
                    className={cn(
                      "text-sm leading-relaxed select-text",
                      isCurrentSegment ? "text-white" : "text-zinc-300"
                    )}
                  >
                    {segment.wordTimestamps ? (
                      // Word-level display
                      (segment.wordTimestamps as WordTimestamp[]).map(
                        (word, wordIndex) => {
                          const isCurrentWord =
                            currentTime >= word.start && currentTime < word.end;
                          return (
                            <span
                              key={wordIndex}
                              ref={(el) => {
                                if (el) {
                                  wordRefs.current.set(
                                    `${segment.id}-${wordIndex}`,
                                    el
                                  );
                                }
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWordClick(segment, wordIndex);
                              }}
                              className={cn(
                                "cursor-pointer hover:bg-blue-500/30 rounded px-0.5 transition-colors",
                                isCurrentWord && "bg-blue-500/50 text-white"
                              )}
                            >
                              {word.word}{" "}
                            </span>
                          );
                        }
                      )
                    ) : (
                      // Full text display with search highlight
                      highlightText(segment.text, searchQuery)
                    )}
                  </p>

                  {/* Scores */}
                  <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {segment.interestScore !== null && (
                      <span
                        className={cn(
                          "text-xs",
                          segment.interestScore >= 7
                            ? "text-emerald-400"
                            : segment.interestScore >= 5
                            ? "text-amber-400"
                            : "text-zinc-500"
                        )}
                      >
                        Interesse: {segment.interestScore}/10
                      </span>
                    )}
                    {segment.clarityScore !== null && (
                      <span
                        className={cn(
                          "text-xs",
                          segment.clarityScore >= 7
                            ? "text-emerald-400"
                            : segment.clarityScore >= 5
                            ? "text-amber-400"
                            : "text-zinc-500"
                        )}
                      >
                        Clareza: {segment.clarityScore}/10
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
        <span>{sortedSegments.length} segmentos</span>
        <span>
          {sortedSegments.filter((s) => s.isSelected).length} selecionados
        </span>
      </div>
    </div>
  );
}
