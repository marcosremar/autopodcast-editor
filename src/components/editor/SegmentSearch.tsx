"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Loader2,
  Clock,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Segment } from "@/lib/db/schema";

interface SearchResult {
  segmentId: string;
  text: string;
  startTime: number;
  endTime: number;
  topic: string | null;
  score: number;
}

interface SegmentSearchProps {
  segments: Segment[];
  projectId: string;
  onResultClick: (segmentId: string) => void;
  onHighlightSegments: (segmentIds: string[]) => void;
  className?: string;
}

export function SegmentSearch({
  segments,
  projectId,
  onResultClick,
  onHighlightSegments,
  className,
}: SegmentSearchProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced search using API
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      onHighlightSegments([]);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setSelectedIndex(0);

      try {
        abortControllerRef.current = new AbortController();

        const response = await fetch(`/api/projects/${projectId}/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query.trim(),
            mode: "quick", // Use quick mode for real-time search
            topK: 10,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data = await response.json();
        setResults(data.results || []);
        onHighlightSegments((data.results || []).map((r: SearchResult) => r.segmentId));
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("[Search] Error:", error);
          // Fallback to local search if API fails
          performLocalSearch(query.trim());
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, projectId, segments]);

  // Fallback local search
  const performLocalSearch = useCallback((searchQuery: string) => {
    const normalizedQuery = searchQuery.toLowerCase();
    const queryWords = normalizedQuery.split(/\s+/).filter((w) => w.length > 2);

    const scored = segments.map((segment) => {
      const text = segment.text.toLowerCase();
      let score = 0;

      // Exact phrase match (highest priority)
      if (text.includes(normalizedQuery)) {
        score += 50;
      }

      // Word matches
      queryWords.forEach((word) => {
        if (text.includes(word)) score += 15;
        if (segment.topic?.toLowerCase().includes(word)) score += 25;
        if (segment.keyInsight?.toLowerCase().includes(word)) score += 20;
      });

      return { segment, score };
    });

    const filtered = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const localResults: SearchResult[] = filtered.map((s) => ({
      segmentId: s.segment.id,
      text: s.segment.text,
      startTime: s.segment.startTime,
      endTime: s.segment.endTime,
      topic: s.segment.topic,
      score: s.score,
    }));

    setResults(localResults);
    onHighlightSegments(localResults.map((r) => r.segmentId));
  }, [segments, onHighlightSegments]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      onResultClick(results[selectedIndex].segmentId);
      setIsOpen(false);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setQuery("");
      setResults([]);
      onHighlightSegments([]);
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Clear search
  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    onHighlightSegments([]);
    inputRef.current?.focus();
  };

  // Highlight matching text
  const highlightText = (text: string, maxLength: number = 150) => {
    const truncated = text.length > maxLength ? text.slice(0, maxLength) + "..." : text;

    if (!query.trim()) return truncated;

    const normalizedQuery = query.toLowerCase();
    const lowerText = truncated.toLowerCase();
    const index = lowerText.indexOf(normalizedQuery);

    if (index === -1) return truncated;

    return (
      <>
        {truncated.slice(0, index)}
        <mark className="bg-amber-500/30 text-amber-200 rounded px-0.5">
          {truncated.slice(index, index + query.length)}
        </mark>
        {truncated.slice(index + query.length)}
      </>
    );
  };

  return (
    <div className={cn("relative", className)}>
      {/* Search Input - Clean UI */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar nos segmentos..."
          className="w-full pl-10 pr-10 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
        />

        {/* Loading / Clear button */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isSearching ? (
            <Loader2 className="h-4 w-4 text-zinc-500 animate-spin" />
          ) : query ? (
            <button
              onClick={clearSearch}
              className="p-0.5 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {isOpen && query && (
          <motion.div
            ref={resultsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-[100] max-h-80 overflow-hidden"
          >
            {results.length === 0 ? (
              <div className="p-4 text-center text-zinc-500">
                {isSearching ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Buscando...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-8 w-8 text-zinc-600" />
                    <span>Nenhum resultado encontrado</span>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Results header */}
                <div className="px-3 py-2 border-b border-zinc-700 text-xs text-zinc-500 flex items-center justify-between">
                  <span>
                    {results.length} resultado{results.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Results list */}
                <div className="max-h-60 overflow-y-auto">
                  {results.map((result, index) => (
                    <button
                      key={result.segmentId}
                      onClick={() => {
                        onResultClick(result.segmentId);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full p-3 text-left hover:bg-zinc-700/50 transition-colors border-b border-zinc-700/50 last:border-0",
                        index === selectedIndex && "bg-zinc-700/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Time badge */}
                        <span className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-700/50 px-2 py-1 rounded shrink-0">
                          <Clock className="h-3 w-3" />
                          {formatTime(result.startTime)}
                        </span>

                        <div className="flex-1 min-w-0">
                          {/* Topic */}
                          {result.topic && (
                            <span className="text-xs text-emerald-400 font-medium block mb-1">
                              {result.topic}
                            </span>
                          )}
                          {/* Text with highlight */}
                          <p className="text-sm text-zinc-300 line-clamp-2">
                            {highlightText(result.text)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Keyboard hints */}
                <div className="px-3 py-2 border-t border-zinc-700 flex items-center justify-center gap-4 text-xs text-zinc-600">
                  <span className="flex items-center gap-1">
                    <ArrowUp className="h-3 w-3" />
                    <ArrowDown className="h-3 w-3" />
                    navegar
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-400">Enter</kbd>
                    selecionar
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-400">Esc</kbd>
                    fechar
                  </span>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
