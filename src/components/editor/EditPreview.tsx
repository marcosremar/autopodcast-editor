"use client";

import { motion } from "framer-motion";
import { Clock, Play, Check, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PreviewSegment {
  id: string;
  text: string;
  topic?: string;
  startTime: number;
  endTime: number;
  isSelected?: boolean;
  interestScore?: number;
  isNew?: boolean; // Segmento que seria adicionado
  isRemoved?: boolean; // Segmento que seria removido
}

interface EditPreviewProps {
  title?: string;
  description?: string;
  segments: PreviewSegment[];
  showTimeline?: boolean;
  showFullText?: boolean;
  onPlaySegment?: (segment: PreviewSegment) => void;
  onApply?: () => void;
  compact?: boolean;
}

export function EditPreview({
  title,
  description,
  segments,
  showTimeline = true,
  showFullText = false,
  onPlaySegment,
  onApply,
  compact = false,
}: EditPreviewProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const totalDuration = segments.reduce(
    (sum, seg) => sum + (seg.endTime - seg.startTime),
    0
  );

  const newSegments = segments.filter(s => s.isNew);
  const removedSegments = segments.filter(s => s.isRemoved);
  const currentSegments = segments.filter(s => !s.isNew && !s.isRemoved);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-zinc-800/50 rounded-xl border border-zinc-700 overflow-hidden",
        compact ? "p-3" : "p-4"
      )}
    >
      {/* Header */}
      {(title || description) && (
        <div className="mb-3">
          {title && (
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <h4 className="text-sm font-medium text-white">{title}</h4>
            </div>
          )}
          {description && (
            <p className="text-xs text-zinc-400">{description}</p>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 mb-3 text-xs">
        <div className="flex items-center gap-1.5 text-zinc-400">
          <Clock className="h-3 w-3" />
          <span>{formatTime(totalDuration)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400">
          <Check className="h-3 w-3" />
          <span>{currentSegments.length + newSegments.length} segmentos</span>
        </div>
        {newSegments.length > 0 && (
          <div className="flex items-center gap-1.5 text-blue-400">
            <span>+{newSegments.length} novos</span>
          </div>
        )}
        {removedSegments.length > 0 && (
          <div className="flex items-center gap-1.5 text-red-400">
            <span>-{removedSegments.length} removidos</span>
          </div>
        )}
      </div>

      {/* Mini Timeline */}
      {showTimeline && segments.length > 0 && (
        <div className="relative h-8 bg-zinc-900 rounded-lg overflow-hidden mb-3">
          {segments.map((segment, index) => {
            const width = ((segment.endTime - segment.startTime) / totalDuration) * 100;
            const left = segments
              .slice(0, index)
              .reduce((sum, s) => sum + ((s.endTime - s.startTime) / totalDuration) * 100, 0);

            return (
              <div
                key={segment.id}
                className={cn(
                  "absolute top-0 h-full transition-all cursor-pointer",
                  segment.isNew && "bg-blue-500 opacity-80",
                  segment.isRemoved && "bg-red-500 opacity-50 line-through",
                  !segment.isNew && !segment.isRemoved && "bg-emerald-500 opacity-70",
                  "hover:opacity-100"
                )}
                style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
                onClick={() => onPlaySegment?.(segment)}
                title={segment.topic || segment.text.substring(0, 50)}
              />
            );
          })}
        </div>
      )}

      {/* Segment List */}
      <div className={cn("space-y-2", compact ? "max-h-[150px]" : "max-h-[250px]", "overflow-y-auto")}>
        {segments.map((segment, index) => (
          <motion.div
            key={segment.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex items-start gap-2 p-2 rounded-lg transition-colors cursor-pointer",
              segment.isNew && "bg-blue-500/10 border border-blue-500/30",
              segment.isRemoved && "bg-red-500/10 border border-red-500/30 opacity-60",
              !segment.isNew && !segment.isRemoved && "bg-zinc-700/30 hover:bg-zinc-700/50"
            )}
            onClick={() => onPlaySegment?.(segment)}
          >
            {/* Play button */}
            <button className="p-1 rounded bg-zinc-700 hover:bg-emerald-500 transition-colors shrink-0">
              <Play className="h-3 w-3 text-white" fill="currentColor" />
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono text-zinc-500">
                  {formatTime(segment.startTime)}
                </span>
                {segment.topic && (
                  <span className={cn(
                    "text-xs font-medium",
                    segment.isNew && "text-blue-400",
                    segment.isRemoved && "text-red-400 line-through",
                    !segment.isNew && !segment.isRemoved && "text-emerald-400"
                  )}>
                    {segment.topic}
                  </span>
                )}
                {segment.isNew && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                    NOVO
                  </span>
                )}
                {segment.isRemoved && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                    REMOVER
                  </span>
                )}
              </div>
              <p className={cn(
                "text-xs text-zinc-400",
                showFullText ? "" : "line-clamp-2",
                segment.isRemoved && "line-through"
              )}>
                {segment.text}
              </p>
            </div>

            {/* Score */}
            {segment.interestScore !== undefined && (
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                segment.interestScore >= 7 && "bg-emerald-500/20 text-emerald-400",
                segment.interestScore >= 5 && segment.interestScore < 7 && "bg-amber-500/20 text-amber-400",
                segment.interestScore < 5 && "bg-red-500/20 text-red-400"
              )}>
                {segment.interestScore}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Apply Button */}
      {onApply && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onApply}
          className="w-full mt-3 py-2 px-4 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Check className="h-4 w-4" />
          Aplicar esta edicao
        </motion.button>
      )}
    </motion.div>
  );
}

/**
 * Preview compacto para mostrar apenas mudancas
 */
export function EditDiff({
  before,
  after,
  onApply,
}: {
  before: PreviewSegment[];
  after: PreviewSegment[];
  onApply?: () => void;
}) {
  const added = after.filter(a => !before.find(b => b.id === a.id));
  const removed = before.filter(b => !after.find(a => a.id === b.id));
  const kept = after.filter(a => before.find(b => b.id === a.id));

  const beforeDuration = before.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
  const afterDuration = after.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
  const diff = afterDuration - beforeDuration;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.floor(Math.abs(seconds) % 60);
    return `${seconds < 0 ? "-" : "+"}${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-3"
    >
      {/* Diff Stats */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 text-xs">
          {added.length > 0 && (
            <span className="text-blue-400">+{added.length} adicionados</span>
          )}
          {removed.length > 0 && (
            <span className="text-red-400">-{removed.length} removidos</span>
          )}
          <span className="text-zinc-500">{kept.length} mantidos</span>
        </div>
        <div className={cn(
          "text-xs font-mono",
          diff > 0 ? "text-blue-400" : diff < 0 ? "text-amber-400" : "text-zinc-400"
        )}>
          {formatTime(diff)}
        </div>
      </div>

      {/* Visual diff */}
      <div className="flex gap-1 mb-3">
        {/* Before */}
        <div className="flex-1">
          <div className="text-[10px] text-zinc-500 mb-1">Antes</div>
          <div className="h-4 bg-zinc-900 rounded flex overflow-hidden">
            {before.map((seg, i) => (
              <div
                key={seg.id}
                className={cn(
                  "h-full",
                  removed.find(r => r.id === seg.id) ? "bg-red-500" : "bg-zinc-600"
                )}
                style={{ flex: seg.endTime - seg.startTime }}
              />
            ))}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center px-2 text-zinc-500">→</div>

        {/* After */}
        <div className="flex-1">
          <div className="text-[10px] text-zinc-500 mb-1">Depois</div>
          <div className="h-4 bg-zinc-900 rounded flex overflow-hidden">
            {after.map((seg, i) => (
              <div
                key={seg.id}
                className={cn(
                  "h-full",
                  added.find(a => a.id === seg.id) ? "bg-blue-500" : "bg-emerald-500"
                )}
                style={{ flex: seg.endTime - seg.startTime }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Apply Button */}
      {onApply && (
        <button
          onClick={onApply}
          className="w-full py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-medium rounded-lg transition-colors"
        >
          Aplicar mudancas
        </button>
      )}
    </motion.div>
  );
}
