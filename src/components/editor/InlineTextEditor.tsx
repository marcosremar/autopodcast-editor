"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Check, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

// TextCut matches the schema in src/lib/db/schema.ts
export interface TextCut {
  startTime: number; // seconds (absolute position in segment)
  endTime: number; // seconds (absolute position in segment)
  deletedText: string; // the text that was deleted
}

// Word timestamp from Whisper transcription
export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

interface InlineTextEditorProps {
  text: string;
  originalText: string;
  textCuts?: TextCut[];
  wordTimestamps?: WordTimestamp[]; // Precise word-level timestamps from Whisper
  segmentStartTime: number; // segment start time in seconds
  segmentEndTime: number; // segment end time in seconds
  onSave: (newText: string, textCuts: TextCut[]) => void;
  onCancel?: () => void;
  className?: string;
  isCurrentSegment?: boolean;
}

export function InlineTextEditor({
  text,
  originalText,
  textCuts = [],
  wordTimestamps = [],
  segmentStartTime,
  segmentEndTime,
  onSave,
  onCancel,
  className,
  isCurrentSegment = false,
}: InlineTextEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(text);
  const [currentCuts, setCurrentCuts] = useState<TextCut[]>(textCuts);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const segmentDuration = segmentEndTime - segmentStartTime;

  // Sync with props
  useEffect(() => {
    if (!isEditing) {
      setEditedText(text);
      setCurrentCuts(textCuts);
    }
  }, [text, textCuts, isEditing]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [editedText, isEditing]);

  // Focus on edit start
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(editedText.length, editedText.length);
    }
  }, [isEditing]);

  // Click outside to save
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (isEditing) {
          handleSave();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing, editedText, currentCuts]);

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditedText(text);
  };

  const handleSave = () => {
    console.log("[InlineTextEditor] Saving:", {
      editedText: editedText.trim(),
      currentCuts,
      originalCutsLength: textCuts.length
    });
    onSave(editedText.trim(), currentCuts);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(text);
    setCurrentCuts(textCuts);
    setIsEditing(false);
    onCancel?.();
  };

  // Find words that match the selected text and return their timestamps
  const findWordTimestamps = useCallback((selectedText: string, charStart: number, charEnd: number): { start: number; end: number } | null => {
    if (!wordTimestamps || wordTimestamps.length === 0) {
      return null;
    }

    // Normalize selected text for matching
    const selectedLower = selectedText.toLowerCase().trim();
    const selectedWords = selectedLower.split(/\s+/).filter(w => w.length > 0);

    if (selectedWords.length === 0) return null;

    // Find matching words in wordTimestamps
    // We need to find a sequence of words that matches our selection
    let firstMatchIdx = -1;
    let lastMatchIdx = -1;

    // Build a map of character positions to word indices
    let charPos = 0;
    const wordAtChar: number[] = [];

    for (let i = 0; i < wordTimestamps.length; i++) {
      const word = wordTimestamps[i].word;
      // Find this word's position in original text
      const wordStart = originalText.toLowerCase().indexOf(word.toLowerCase(), charPos);
      if (wordStart >= 0) {
        // Mark all characters of this word as belonging to this word index
        for (let j = wordStart; j < wordStart + word.length; j++) {
          wordAtChar[j] = i;
        }
        charPos = wordStart + word.length;
      }
    }

    // Find which words are covered by our selection
    for (let i = charStart; i < charEnd && i < wordAtChar.length; i++) {
      if (wordAtChar[i] !== undefined) {
        if (firstMatchIdx === -1) firstMatchIdx = wordAtChar[i];
        lastMatchIdx = wordAtChar[i];
      }
    }

    if (firstMatchIdx >= 0 && lastMatchIdx >= 0) {
      const startTime = wordTimestamps[firstMatchIdx].start;
      const endTime = wordTimestamps[lastMatchIdx].end;
      console.log("[InlineTextEditor] Found word timestamps:", {
        words: wordTimestamps.slice(firstMatchIdx, lastMatchIdx + 1).map(w => w.word),
        startTime,
        endTime
      });
      return { start: startTime, end: endTime };
    }

    return null;
  }, [wordTimestamps, originalText]);

  // Delete selected text and track for audio cut
  const deleteSelection = useCallback(() => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;

    if (start === end) return;

    const selectedText = editedText.substring(start, end);
    const newText = editedText.substring(0, start) + editedText.substring(end);

    // Try to find precise timestamps from wordTimestamps
    const preciseTimestamps = findWordTimestamps(selectedText, start, end);

    let cutStartTime: number;
    let cutEndTime: number;

    if (preciseTimestamps) {
      // Use precise timestamps from Whisper
      cutStartTime = preciseTimestamps.start;
      cutEndTime = preciseTimestamps.end;
      console.log("[InlineTextEditor] Using precise word timestamps");
    } else {
      // Fallback: Calculate time positions based on character position (approximation)
      console.log("[InlineTextEditor] Using approximate timestamps (no word timestamps available)");
      const originalLength = originalText.length;
      const startPercent = start / originalLength;
      const endPercent = end / originalLength;
      cutStartTime = segmentStartTime + (startPercent * segmentDuration);
      cutEndTime = segmentStartTime + (endPercent * segmentDuration);
    }

    const newCut = {
      startTime: cutStartTime,
      endTime: cutEndTime,
      deletedText: selectedText,
    };
    console.log("[InlineTextEditor] Adding cut:", newCut);
    setCurrentCuts((prev) => [...prev, newCut]);

    setEditedText(newText);
    setSelection(null);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(start, start);
        textareaRef.current.focus();
      }
    }, 0);
  }, [editedText, originalText, segmentStartTime, segmentDuration, findWordTimestamps]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      // Intercept any delete/backspace when there's a selection to create audio cuts
      if (textareaRef.current) {
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        if (start !== end) {
          e.preventDefault();
          deleteSelection();
        }
      }
    }
  };

  const handleSelect = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      setSelection(start !== end ? { start, end } : null);
    }
  };

  // Render text with strikethrough for deleted words
  const renderTextWithCuts = () => {
    if (currentCuts.length === 0) {
      return <span>{text}</span>;
    }

    // Compare original text with current text to find deleted parts
    const originalWords = originalText.split(/(\s+)/);
    const currentWords = text.split(/(\s+)/);

    // Create a set of current words for quick lookup
    const currentWordSet = new Set(currentWords.filter(w => w.trim()));

    // Build list of deleted texts from cuts
    const deletedTexts = currentCuts.map(cut => cut.deletedText.trim().toLowerCase());

    return (
      <span>
        {originalWords.map((word, i) => {
          if (!word.trim()) {
            return <span key={i}>{word}</span>;
          }

          // Check if this word was deleted
          const wordLower = word.toLowerCase();
          const isDeleted = deletedTexts.some(deleted =>
            deleted.includes(wordLower) || wordLower.includes(deleted)
          ) || !currentWordSet.has(word);

          if (isDeleted) {
            return (
              <span
                key={i}
                className="line-through text-red-400/70 decoration-red-500"
              >
                {word}
              </span>
            );
          }

          return <span key={i}>{word}</span>;
        })}
      </span>
    );
  };

  // Non-editing view - compact
  if (!isEditing) {
    const hasEdits = text !== originalText || currentCuts.length > 0;

    return (
      <div
        ref={containerRef}
        className={cn(
          "group relative cursor-pointer rounded px-1 -mx-1 transition-colors",
          "hover:bg-zinc-700/30",
          className
        )}
        onClick={startEditing}
      >
        {/* Compact edit icon on hover */}
        <Pencil className="absolute -left-4 top-0.5 h-3 w-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Text with strikethrough for cuts */}
        <span className={cn(
          "text-sm leading-relaxed",
          isCurrentSegment ? "text-white" : "text-zinc-300"
        )}>
          {hasEdits ? renderTextWithCuts() : text}
        </span>
      </div>
    );
  }

  // Editing view - compact
  return (
    <div
      ref={containerRef}
      className={cn(
        "relative rounded bg-zinc-800/80 ring-1 ring-emerald-500/50 p-2 -mx-1",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Compact toolbar */}
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          {selection && (
            <button
              onClick={deleteSelection}
              className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
              title="Cortar do audio"
            >
              Cortar
            </button>
          )}
          {currentCuts.length > 0 && (
            <span className="text-red-400/70">
              {currentCuts.length} corte{currentCuts.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={handleCancel}
            className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded transition-colors"
            title="Cancelar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleSave}
            className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 rounded transition-colors"
            title="Salvar"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={editedText}
        onChange={(e) => setEditedText(e.target.value)}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
        className="w-full bg-transparent text-sm text-zinc-200 resize-none focus:outline-none leading-relaxed min-h-[40px] max-h-[120px]"
        rows={2}
      />

      {/* Hint */}
      <div className="text-[10px] text-zinc-600 mt-1">
        Selecione texto + Del para cortar do audio
      </div>
    </div>
  );
}
