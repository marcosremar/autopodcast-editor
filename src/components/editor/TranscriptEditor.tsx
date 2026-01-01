"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Play,
  Check,
  FileText,
  Edit3,
  Undo2,
  Save,
  Scissors,
  Clock,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Segment, WordTimestamp, TextCut } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";

interface TranscriptEditorProps {
  segments: Segment[];
  currentTime: number;
  onSeekTo: (time: number) => void;
  onSelectSegment: (segmentId: string) => void;
  onUpdateSegment?: (segmentId: string, updates: Partial<Segment>) => void;
  className?: string;
}

interface SegmentEdit {
  segmentId: string;
  originalText: string;
  editedText: string;
  originalWords: WordTimestamp[];
  deletedWordIndices: Set<number>;
  cuts: TextCut[];
  hasChanges: boolean;
  isSaved: boolean;
}

export function TranscriptEditor({
  segments,
  currentTime,
  onSeekTo,
  onSelectSegment,
  onUpdateSegment,
  className,
}: TranscriptEditorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [segmentEdits, setSegmentEdits] = useState<Map<string, SegmentEdit>>(new Map());
  const [savingSegmentId, setSavingSegmentId] = useState<string | null>(null);
  const [editTextValue, setEditTextValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sort segments by time
  const sortedSegments = useMemo(
    () => [...segments].sort((a, b) => a.startTime - b.startTime),
    [segments]
  );

  // Find current segment based on currentTime
  const currentSegmentIndex = useMemo(() => {
    return sortedSegments.findIndex(
      (seg) => currentTime >= seg.startTime && currentTime < seg.endTime
    );
  }, [sortedSegments, currentTime]);

  // Initialize segment edits from saved data
  // Only update edits for segments that don't have active edits in progress
  useEffect(() => {
    setSegmentEdits(prevEdits => {
      const newEdits = new Map<string, SegmentEdit>();

      segments.forEach(segment => {
        // Preserve existing edit if we're currently editing this segment
        const existingEdit = prevEdits.get(segment.id);
        if (existingEdit && editingSegmentId === segment.id) {
          newEdits.set(segment.id, existingEdit);
          return;
        }

        const words = (segment.wordTimestamps as WordTimestamp[]) || [];
        const textCuts = (segment.textCuts as TextCut[]) || [];
        const savedEditedText = segment.editedText as string | null;

        // Find deleted word indices from saved data
        const deletedIndices = new Set<number>();
        words.forEach((w, i) => {
          if (w.isDeleted) deletedIndices.add(i);
        });

        const hasChanges = deletedIndices.size > 0 || textCuts.length > 0 || (savedEditedText !== null && savedEditedText !== segment.text);

        newEdits.set(segment.id, {
          segmentId: segment.id,
          originalText: segment.text,
          editedText: savedEditedText || segment.text,
          originalWords: words,
          deletedWordIndices: deletedIndices,
          cuts: textCuts,
          hasChanges,
          isSaved: hasChanges, // If there are changes, they were saved
        });
      });

      return newEdits;
    });
  }, [segments, editingSegmentId]);

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

  // Track last scrolled segment and gap state
  const lastScrolledIndexRef = useRef<number>(-1);
  const wasInGapRef = useRef(false);

  // Detect when entering a gap (no current segment)
  useEffect(() => {
    if (currentSegmentIndex < 0) {
      wasInGapRef.current = true;
    }
  }, [currentSegmentIndex]);

  // Auto-scroll: ONLY if we didn't come from a gap
  useEffect(() => {
    // No segment or editing = no scroll
    if (currentSegmentIndex < 0 || editingSegmentId) {
      return;
    }

    // Same segment = no scroll
    if (lastScrolledIndexRef.current === currentSegmentIndex) {
      return;
    }

    // Check if we came from a gap
    const cameFromGap = wasInGapRef.current;

    // Update refs
    lastScrolledIndexRef.current = currentSegmentIndex;
    wasInGapRef.current = false;

    // Don't scroll if we came from a gap
    if (cameFromGap) {
      return;
    }

    const currentSeg = sortedSegments[currentSegmentIndex];
    const element = document.getElementById(`segment-${currentSeg.id}`);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentSegmentIndex, sortedSegments, editingSegmentId]);

  // Focus textarea when editing
  useEffect(() => {
    if (editingSegmentId && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [editingSegmentId]);

  // Navigate search results
  const navigateResult = (direction: "prev" | "next") => {
    if (searchResults.length === 0) return;

    let newIndex;
    if (direction === "next") {
      newIndex = (currentResultIndex + 1) % searchResults.length;
    } else {
      newIndex = (currentResultIndex - 1 + searchResults.length) % searchResults.length;
    }

    setCurrentResultIndex(newIndex);

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

  // Start editing a segment (double-click)
  const startEditing = useCallback((segment: Segment, e?: React.MouseEvent) => {
    // Prevent event bubbling to parent elements
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const edit = segmentEdits.get(segment.id);
    if (edit) {
      setEditTextValue(edit.editedText);
      setEditingSegmentId(segment.id);
    } else {
      setEditTextValue(segment.text);
      setEditingSegmentId(segment.id);
    }
  }, [segmentEdits]);

  // Calculate which words were deleted by comparing original and edited text
  const calculateDeletedWords = (
    originalWords: WordTimestamp[],
    originalText: string,
    editedText: string
  ): { deletedIndices: Set<number>; cuts: TextCut[] } => {
    const deletedIndices = new Set<number>();
    const cuts: TextCut[] = [];

    // Normalize texts for comparison
    const editedWordsArray = editedText.trim().split(/\s+/).filter(w => w.length > 0);
    const editedWordsSet = new Set(editedWordsArray.map(w => w.toLowerCase().replace(/[.,!?;:]/g, '')));

    // Track which edited words we've matched
    let editedIndex = 0;
    let currentCut: TextCut | null = null;

    originalWords.forEach((word, index) => {
      const normalizedWord = word.word.toLowerCase().replace(/[.,!?;:]/g, '');

      // Check if this word exists in the edited text at the expected position
      const editedWordNormalized = editedWordsArray[editedIndex]?.toLowerCase().replace(/[.,!?;:]/g, '');

      if (normalizedWord === editedWordNormalized) {
        // Word is kept
        editedIndex++;
        if (currentCut) {
          cuts.push(currentCut);
          currentCut = null;
        }
      } else {
        // Word was deleted
        deletedIndices.add(index);

        if (!currentCut) {
          currentCut = {
            startTime: word.start,
            endTime: word.end,
            deletedText: word.word,
            wordIndices: [index],
          };
        } else {
          currentCut.endTime = word.end;
          currentCut.deletedText += " " + word.word;
          currentCut.wordIndices.push(index);
        }
      }
    });

    // Don't forget last cut
    if (currentCut) {
      cuts.push(currentCut);
    }

    return { deletedIndices, cuts };
  };

  // Save segment edits
  const saveSegmentEdits = async (segmentId: string) => {
    const edit = segmentEdits.get(segmentId);
    const segment = segments.find(s => s.id === segmentId);
    if (!edit || !segment || !onUpdateSegment) return;

    setSavingSegmentId(segmentId);

    try {
      let deletedIndices = new Set<number>();
      let cuts: TextCut[] = [];
      let updatedWords = edit.originalWords;

      // Only calculate cuts if we have word timestamps
      if (edit.originalWords.length > 0) {
        const result = calculateDeletedWords(
          edit.originalWords,
          edit.originalText,
          editTextValue
        );
        deletedIndices = result.deletedIndices;
        cuts = result.cuts;

        // Update word timestamps with isDeleted flag
        updatedWords = edit.originalWords.map((w, i) => ({
          ...w,
          isDeleted: deletedIndices.has(i),
        }));
      }

      // Update the segment
      onUpdateSegment(segmentId, {
        wordTimestamps: updatedWords.length > 0 ? updatedWords : undefined,
        textCuts: cuts.length > 0 ? cuts : undefined,
        editedText: editTextValue,
      });

      // Check if text was changed
      const textWasChanged = editTextValue !== edit.originalText;

      // Update local state
      setSegmentEdits(prev => {
        const newEdits = new Map(prev);
        newEdits.set(segmentId, {
          ...edit,
          editedText: editTextValue,
          deletedWordIndices: deletedIndices,
          cuts,
          hasChanges: deletedIndices.size > 0 || textWasChanged,
          isSaved: true,
        });
        return newEdits;
      });

      // Exit edit mode
      setEditingSegmentId(null);
    } catch (error) {
      console.error("Error saving segment edits:", error);
    } finally {
      setSavingSegmentId(null);
    }
  };

  // Revert segment edits
  const revertSegmentEdits = (segmentId: string) => {
    const edit = segmentEdits.get(segmentId);
    if (!edit) return;

    setEditTextValue(edit.originalText);

    setSegmentEdits(prev => {
      const newEdits = new Map(prev);
      newEdits.set(segmentId, {
        ...edit,
        editedText: edit.originalText,
        deletedWordIndices: new Set(),
        cuts: [],
        hasChanges: false,
        isSaved: false,
      });
      return newEdits;
    });

    // Also update in database
    if (onUpdateSegment) {
      const updatedWords = edit.originalWords.map(w => ({
        ...w,
        isDeleted: false,
      }));
      onUpdateSegment(segmentId, {
        wordTimestamps: updatedWords,
        textCuts: [],
        editedText: null,
      });
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    const edit = segmentEdits.get(editingSegmentId || "");
    if (edit) {
      setEditTextValue(edit.isSaved ? edit.editedText : edit.originalText);
    }
    setEditingSegmentId(null);
  };

  // Get segment edit state
  const getSegmentEdit = (segmentId: string): SegmentEdit | undefined => {
    return segmentEdits.get(segmentId);
  };

  // Calculate time saved from cuts
  const calculateTimeSaved = (cuts: TextCut[]): number => {
    return cuts.reduce((total, cut) => total + (cut.endTime - cut.startTime), 0);
  };

  // Get deleted words text
  const getDeletedWordsText = (edit: SegmentEdit): string[] => {
    return Array.from(edit.deletedWordIndices)
      .sort((a, b) => a - b)
      .map(i => edit.originalWords[i]?.word)
      .filter(Boolean);
  };

  return (
    <div className={cn("flex flex-col h-full bg-zinc-900", className)}>
      {/* Header with search */}
      <div className="p-3 border-b border-zinc-800">
        {/* Search Bar */}
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
              <button onClick={() => navigateResult("prev")} disabled={searchResults.length === 0} className="p-1 text-zinc-400 hover:text-white disabled:opacity-50">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button onClick={() => navigateResult("next")} disabled={searchResults.length === 0} className="p-1 text-zinc-400 hover:text-white disabled:opacity-50">
                <ChevronDown className="h-4 w-4" />
              </button>
              <button onClick={() => setSearchQuery("")} className="p-1 text-zinc-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Transcript */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4">
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
              const isCurrentResult = isSearchResult && searchResults[currentResultIndex] === index;
              const isEditing = editingSegmentId === segment.id;
              const edit = getSegmentEdit(segment.id);
              const hasWordTimestamps = segment.wordTimestamps && (segment.wordTimestamps as WordTimestamp[]).length > 0;
              const cuts = edit?.cuts || [];
              const timeSaved = calculateTimeSaved(cuts);
              const deletedWords = edit ? getDeletedWordsText(edit) : [];
              const hasEdits = edit?.hasChanges && edit?.isSaved;

              return (
                <motion.div
                  key={segment.id}
                  id={`segment-${segment.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onDoubleClick={(e) => startEditing(segment, e)}
                  className={cn(
                    "group rounded-lg transition-all cursor-pointer",
                    isEditing
                      ? "bg-zinc-800 border-2 border-blue-500 p-4"
                      : hasEdits
                      ? "bg-emerald-500/10 border border-emerald-500/30 p-3"
                      : isCurrentSegment
                      ? "bg-blue-500/20 border border-blue-500/30 p-3"
                      : isCurrentResult
                      ? "bg-amber-500/20 border border-amber-500/30 p-3"
                      : isSearchResult
                      ? "bg-amber-500/10 p-3"
                      : "hover:bg-zinc-800/50 p-3",
                    segment.isSelected && "border-l-4 border-l-emerald-500"
                  )}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
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

                    {/* Edit indicator */}
                    {!isEditing && (
                      <div className="flex items-center gap-2">
                        {hasEdits && (
                          <span className="flex items-center gap-1 text-xs text-emerald-400">
                            <Scissors className="h-3 w-3" />
                            {cuts.length} corte{cuts.length !== 1 ? "s" : ""} ({formatTime(timeSaved)})
                          </span>
                        )}
                        <span className="text-xs text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          Duplo clique para editar
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  {isEditing ? (
                    // Edit Mode
                    <div className="space-y-4">
                      {/* Edited Text (main - editable) */}
                      <div>
                        <label className="flex items-center gap-2 text-xs text-blue-400 mb-2">
                          <Edit3 className="h-3 w-3" />
                          {hasWordTimestamps
                            ? "Texto editado (remova palavras para cortar o audio)"
                            : "Texto editado (salve para manter suas alteracoes)"
                          }
                        </label>
                        <textarea
                          ref={textareaRef}
                          value={editTextValue}
                          onChange={(e) => setEditTextValue(e.target.value)}
                          className="w-full p-3 bg-zinc-900 border border-zinc-600 rounded-lg text-white text-sm leading-relaxed resize-none focus:outline-none focus:border-blue-500 min-h-[100px]"
                          rows={4}
                        />
                      </div>

                      {/* Original Text (reference - smaller) */}
                      <div>
                        <label className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                          <Type className="h-3 w-3" />
                          Texto original
                        </label>
                        <p className="text-xs text-zinc-500 leading-relaxed bg-zinc-900/50 p-2 rounded border border-zinc-800">
                          {segment.text}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-zinc-700">
                        <Button
                          onClick={() => saveSegmentEdits(segment.id)}
                          disabled={editTextValue === segment.text || savingSegmentId === segment.id}
                          className="bg-emerald-500 hover:bg-emerald-400 text-white"
                          size="sm"
                        >
                          {savingSegmentId === segment.id ? (
                            <span className="animate-spin mr-2">...</span>
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Salvar Alteracoes
                        </Button>
                        <Button
                          onClick={cancelEditing}
                          variant="ghost"
                          size="sm"
                          className="text-zinc-400 hover:text-white"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="space-y-2">
                      {/* Edited Text (main - if has edits) or Original */}
                      <p
                        className={cn(
                          "text-sm leading-relaxed select-text",
                          isCurrentSegment ? "text-white" : "text-zinc-300"
                        )}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startEditing(segment, e);
                        }}
                      >
                        {hasEdits ? edit?.editedText : segment.text}
                      </p>

                      {/* Show original + deleted words if has edits */}
                      {hasEdits && (
                        <div className="pt-2 border-t border-zinc-800 space-y-2">
                          {/* Deleted words */}
                          {deletedWords.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-xs text-red-400 flex items-center gap-1">
                                <Scissors className="h-3 w-3" />
                                Removido:
                              </span>
                              {deletedWords.map((word, i) => (
                                <span
                                  key={i}
                                  className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded line-through"
                                >
                                  {word}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Original text (smaller) */}
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-zinc-600 shrink-0">Original:</span>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                              {segment.text}
                            </p>
                          </div>

                          {/* Revert button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              revertSegmentEdits(segment.id);
                            }}
                            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-amber-400 transition-colors"
                          >
                            <Undo2 className="h-3 w-3" />
                            Reverter para original
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Scores (only when not editing) */}
                  {!isEditing && (
                    <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {segment.interestScore !== null && (
                        <span className={cn(
                          "text-xs",
                          segment.interestScore >= 7 ? "text-emerald-400" : segment.interestScore >= 5 ? "text-amber-400" : "text-zinc-500"
                        )}>
                          Interesse: {segment.interestScore}/10
                        </span>
                      )}
                      {segment.clarityScore !== null && (
                        <span className={cn(
                          "text-xs",
                          segment.clarityScore >= 7 ? "text-emerald-400" : segment.clarityScore >= 5 ? "text-amber-400" : "text-zinc-500"
                        )}>
                          Clareza: {segment.clarityScore}/10
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
        <span>{sortedSegments.length} segmentos</span>
        <div className="flex items-center gap-4">
          <span>{sortedSegments.filter((s) => s.isSelected).length} selecionados</span>
          {Array.from(segmentEdits.values()).filter(e => e.hasChanges && e.isSaved).length > 0 && (
            <span className="text-emerald-400">
              {Array.from(segmentEdits.values()).filter(e => e.hasChanges && e.isSaved).length} editado{Array.from(segmentEdits.values()).filter(e => e.hasChanges && e.isSaved).length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
