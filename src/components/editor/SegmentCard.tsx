"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Segment, SegmentAnalysis } from "@/lib/db/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Play,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  GripVertical,
  Mic,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SegmentCardProps {
  segment: Segment;
  isSelected: boolean;
  onToggleSelect: (segmentId: string) => void;
  onPlay: (segment: Segment) => void;
  showDragHandle?: boolean;
  className?: string;
}

export function SegmentCard({
  segment,
  isSelected,
  onToggleSelect,
  onPlay,
  showDragHandle = false,
  className,
}: SegmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const analysis = segment.analysis as SegmentAnalysis | null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const duration = segment.endTime - segment.startTime;

  const getScoreBadgeVariant = (score: number | null) => {
    if (!score) return "outline";
    if (score >= 8) return "default";
    if (score >= 5) return "secondary";
    return "outline";
  };

  const truncateText = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  const needsRerecord = analysis?.needsRerecord || false;

  return (
    <motion.div
      layout
      className={cn("group relative", className)}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "transition-all duration-200",
          isSelected
            ? "border-blue-500 bg-blue-50/50 shadow-md"
            : "hover:shadow-md",
          segment.hasError && "border-red-300 bg-red-50/30"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            {/* Drag handle */}
            {showDragHandle && (
              <div className="cursor-grab active:cursor-grabbing pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-5 w-5 text-gray-400" />
              </div>
            )}

            {/* Checkbox */}
            <button
              onClick={() => onToggleSelect(segment.id)}
              className={cn(
                "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all",
                isSelected
                  ? "border-blue-600 bg-blue-600"
                  : "border-gray-300 hover:border-blue-400"
              )}
              aria-label={isSelected ? "Deselect segment" : "Select segment"}
            >
              {isSelected && <CheckCircle2 className="h-4 w-4 text-white" />}
            </button>

            {/* Content */}
            <div className="flex-1 space-y-2">
              {/* Text preview */}
              <p className="text-sm leading-relaxed text-gray-700">
                {isExpanded ? segment.text : truncateText(segment.text)}
              </p>

              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Time range */}
                <Badge variant="outline" className="text-xs">
                  {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                </Badge>

                {/* Duration */}
                <Badge variant="outline" className="text-xs">
                  {formatTime(duration)}
                </Badge>

                {/* Interest score */}
                {segment.interestScore !== null && (
                  <Badge
                    variant={getScoreBadgeVariant(segment.interestScore)}
                    className="text-xs"
                  >
                    Interest: {segment.interestScore}/10
                  </Badge>
                )}

                {/* Clarity score */}
                {segment.clarityScore !== null && (
                  <Badge
                    variant={getScoreBadgeVariant(segment.clarityScore)}
                    className="text-xs"
                  >
                    Clarity: {segment.clarityScore}/10
                  </Badge>
                )}

                {/* Topic */}
                {segment.topic && (
                  <Badge variant="secondary" className="text-xs">
                    {segment.topic}
                  </Badge>
                )}

                {/* Error indicator */}
                {segment.hasError && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {segment.errorType || "Error"}
                  </Badge>
                )}

                {/* Needs rerecord */}
                {needsRerecord && (
                  <Badge variant="outline" className="text-xs gap-1 border-orange-400 text-orange-700">
                    <Mic className="h-3 w-3" />
                    Rerecord Suggested
                  </Badge>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex shrink-0 gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => onPlay(segment)}
                title="Play segment"
              >
                <Play className="h-4 w-4" />
              </Button>

              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Show less" : "Show more"}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="border-t pt-4 space-y-3">
                {/* Key insight */}
                {segment.keyInsight && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 mb-1">
                      Key Insight:
                    </h4>
                    <p className="text-sm text-gray-700">
                      {segment.keyInsight}
                    </p>
                  </div>
                )}

                {/* Analysis details */}
                {analysis && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-600">
                      Analysis:
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {analysis.isTangent && (
                        <div className="flex items-center gap-1 text-orange-600">
                          <div className="h-2 w-2 rounded-full bg-orange-500" />
                          <span>Tangent detected</span>
                        </div>
                      )}
                      {analysis.isRepetition && (
                        <div className="flex items-center gap-1 text-yellow-600">
                          <div className="h-2 w-2 rounded-full bg-yellow-500" />
                          <span>Contains repetition</span>
                        </div>
                      )}
                      {analysis.standalone && (
                        <div className="flex items-center gap-1 text-green-600">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span>Standalone</span>
                        </div>
                      )}
                      {analysis.hasFactualError && (
                        <div className="flex items-center gap-1 text-red-600">
                          <div className="h-2 w-2 rounded-full bg-red-500" />
                          <span>Factual error</span>
                        </div>
                      )}
                      {analysis.hasContradiction && (
                        <div className="flex items-center gap-1 text-red-600">
                          <div className="h-2 w-2 rounded-full bg-red-500" />
                          <span>Contradiction</span>
                        </div>
                      )}
                      {analysis.isConfusing && (
                        <div className="flex items-center gap-1 text-orange-600">
                          <div className="h-2 w-2 rounded-full bg-orange-500" />
                          <span>Confusing</span>
                        </div>
                      )}
                      {analysis.isIncomplete && (
                        <div className="flex items-center gap-1 text-yellow-600">
                          <div className="h-2 w-2 rounded-full bg-yellow-500" />
                          <span>Incomplete</span>
                        </div>
                      )}
                    </div>

                    {/* Error details */}
                    {(analysis.factualErrorDetail ||
                      analysis.contradictionDetail ||
                      analysis.confusingDetail ||
                      analysis.incompleteDetail) && (
                      <div className="space-y-1">
                        {analysis.factualErrorDetail && (
                          <p className="text-xs text-red-600">
                            <strong>Factual error:</strong>{" "}
                            {analysis.factualErrorDetail}
                          </p>
                        )}
                        {analysis.contradictionDetail && (
                          <p className="text-xs text-red-600">
                            <strong>Contradiction:</strong>{" "}
                            {analysis.contradictionDetail}
                          </p>
                        )}
                        {analysis.confusingDetail && (
                          <p className="text-xs text-orange-600">
                            <strong>Confusing:</strong>{" "}
                            {analysis.confusingDetail}
                          </p>
                        )}
                        {analysis.incompleteDetail && (
                          <p className="text-xs text-yellow-600">
                            <strong>Incomplete:</strong>{" "}
                            {analysis.incompleteDetail}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Rerecord suggestion */}
                    {analysis.rerecordSuggestion && (
                      <div className="rounded-lg bg-orange-50 p-3 border border-orange-200">
                        <h5 className="text-xs font-semibold text-orange-800 mb-1">
                          Rerecord Suggestion:
                        </h5>
                        <p className="text-xs text-orange-700">
                          {analysis.rerecordSuggestion}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 border-orange-400 text-orange-700 hover:bg-orange-100"
                        >
                          <Mic className="h-3 w-3 mr-1" />
                          Rerecord Segment
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Error details */}
                {segment.hasError && segment.errorDetail && (
                  <div className="rounded-lg bg-red-50 p-3 border border-red-200">
                    <h4 className="text-xs font-semibold text-red-800 mb-1">
                      Error Details:
                    </h4>
                    <p className="text-xs text-red-700">
                      {segment.errorDetail}
                    </p>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
