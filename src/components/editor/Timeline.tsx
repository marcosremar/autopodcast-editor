"use client";

import { useState } from "react";
import { motion, Reorder } from "framer-motion";
import { Segment } from "@/lib/db/schema";
import { SegmentCard } from "./SegmentCard";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineProps {
  segments: Segment[];
  onReorder: (newOrder: Segment[]) => void;
  onToggleSelect: (segmentId: string) => void;
  onPlaySegment: (segment: Segment) => void;
  className?: string;
}

export function Timeline({
  segments,
  onReorder,
  onToggleSelect,
  onPlaySegment,
  className,
}: TimelineProps) {
  const selectedSegments = segments
    .filter((s) => s.isSelected)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const totalDuration = selectedSegments.reduce(
    (sum, seg) => sum + (seg.endTime - seg.startTime),
    0
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "bg-gray-500";
    if (score >= 8) return "bg-green-500";
    if (score >= 5) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (selectedSegments.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center",
          className
        )}
      >
        <Clock className="mb-4 h-12 w-12 text-gray-400" />
        <h3 className="mb-2 text-lg font-semibold text-gray-700">
          No segments selected
        </h3>
        <p className="text-sm text-gray-500">
          Select segments from the removed segments section to build your
          timeline
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Duration indicator */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-4"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-gray-700">Total Duration:</span>
          <span className="text-lg font-bold text-blue-600">
            {formatDuration(totalDuration)}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          {selectedSegments.length} segment
          {selectedSegments.length !== 1 ? "s" : ""}
        </div>
      </motion.div>

      {/* Timeline segments */}
      <Reorder.Group
        axis="y"
        values={selectedSegments}
        onReorder={onReorder}
        className="space-y-3"
      >
        {selectedSegments.map((segment, index) => (
          <Reorder.Item
            key={segment.id}
            value={segment}
            className="relative"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="relative">
              {/* Order indicator */}
              <div className="absolute -left-8 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {index + 1}
              </div>

              {/* Score indicator bar */}
              <div
                className={cn(
                  "absolute left-0 top-0 h-full w-1 rounded-l-lg",
                  getScoreColor(segment.interestScore)
                )}
              />

              <div className="pl-2">
                <SegmentCard
                  segment={segment}
                  isSelected={true}
                  onToggleSelect={onToggleSelect}
                  onPlay={onPlaySegment}
                  showDragHandle
                />
              </div>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {/* Score legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-center gap-4 rounded-lg bg-gray-50 p-3 text-xs"
      >
        <span className="font-semibold text-gray-600">Score Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span className="text-gray-600">High (8-10)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <span className="text-gray-600">Medium (5-7)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span className="text-gray-600">Low (0-4)</span>
        </div>
      </motion.div>
    </div>
  );
}
