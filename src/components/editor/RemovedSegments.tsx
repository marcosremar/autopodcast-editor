"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Segment } from "@/lib/db/schema";
import { SegmentCard } from "./SegmentCard";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RemovedSegmentsProps {
  segments: Segment[];
  onToggleSelect: (segmentId: string) => void;
  onPlaySegment: (segment: Segment) => void;
  className?: string;
}

export function RemovedSegments({
  segments,
  onToggleSelect,
  onPlaySegment,
  className,
}: RemovedSegmentsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const removedSegments = segments
    .filter((s) => !s.isSelected)
    .sort((a, b) => a.startTime - b.startTime);

  if (removedSegments.length === 0) {
    return null;
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const totalRemovedDuration = removedSegments.reduce(
    (sum, seg) => sum + (seg.endTime - seg.startTime),
    0
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full justify-between h-auto py-3"
        >
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-gray-500" />
            <div className="text-left">
              <div className="font-semibold text-gray-700">
                Removed Segments
              </div>
              <div className="text-xs text-gray-500">
                {removedSegments.length} segment
                {removedSegments.length !== 1 ? "s" : ""} removed (
                {formatDuration(totalRemovedDuration)} removed)
              </div>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </Button>
      </motion.div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 rounded-lg border bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Click on any segment to add it back to the timeline
                </p>
              </div>

              {/* Segments grid */}
              <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                {removedSegments.map((segment, index) => (
                  <motion.div
                    key={segment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <SegmentCard
                      segment={segment}
                      isSelected={false}
                      onToggleSelect={onToggleSelect}
                      onPlay={onPlaySegment}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Info message */}
              <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs text-blue-700">
                  <strong>Tip:</strong> These segments were removed during the AI
                  analysis. You can add them back by clicking the checkbox on any
                  segment. They may have been removed due to low scores,
                  repetition, or being off-topic.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
