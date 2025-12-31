"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Mic,
  Clock,
  ArrowRight,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GapInfo {
  sectionId: string;
  sectionName: string;
  type: string;
  isRequired: boolean;
  status: "empty" | "partial" | "complete";
  currentDuration: number;
  minDuration: number | null;
  maxDuration: number | null;
  suggestedDuration: number | null;
  exampleText: string | null;
  segmentCount: number;
  missingDuration: number;
  suggestion: string;
}

interface GapAnalysisPanelProps {
  projectId: string;
  gaps: GapInfo[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onRecordSection?: (sectionId: string, targetDuration: number) => void;
  className?: string;
}

export function GapAnalysisPanel({
  projectId,
  gaps,
  isLoading = false,
  onRefresh,
  onRecordSection,
  className,
}: GapAnalysisPanelProps) {
  const [expandedGaps, setExpandedGaps] = useState<Set<string>>(new Set());

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleExpand = (sectionId: string) => {
    const newExpanded = new Set(expandedGaps);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedGaps(newExpanded);
  };

  // Calculate overall completion
  const requiredGaps = gaps.filter((g) => g.isRequired);
  const completedRequired = requiredGaps.filter((g) => g.status === "complete");
  const completionPercent =
    requiredGaps.length > 0
      ? Math.round((completedRequired.length / requiredGaps.length) * 100)
      : 100;

  const totalGaps = gaps.filter((g) => g.status !== "complete").length;
  const criticalGaps = gaps.filter(
    (g) => g.status === "empty" && g.isRequired
  ).length;
  const partialGaps = gaps.filter((g) => g.status === "partial").length;

  // Get status icon and color for dark theme
  const getStatusDisplay = (gap: GapInfo) => {
    switch (gap.status) {
      case "complete":
        return {
          icon: CheckCircle2,
          color: "text-emerald-400",
          bgColor: "bg-emerald-500/10",
          borderColor: "border-emerald-500/30",
          label: "Completo",
        };
      case "partial":
        return {
          icon: AlertTriangle,
          color: "text-yellow-400",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/30",
          label: "Parcial",
        };
      case "empty":
        return gap.isRequired
          ? {
              icon: XCircle,
              color: "text-red-400",
              bgColor: "bg-red-500/10",
              borderColor: "border-red-500/30",
              label: "Vazio (Obrigatorio)",
            }
          : {
              icon: AlertTriangle,
              color: "text-zinc-500",
              bgColor: "bg-zinc-800/50",
              borderColor: "border-zinc-700",
              label: "Vazio (Opcional)",
            };
    }
  };

  // Calculate progress for a gap
  const getProgressPercent = (gap: GapInfo): number => {
    if (gap.status === "complete") return 100;
    if (!gap.suggestedDuration || gap.suggestedDuration === 0) return 0;
    return Math.min(100, Math.round((gap.currentDuration / gap.suggestedDuration) * 100));
  };

  if (isLoading) {
    return (
      <div className={cn("bg-zinc-800/50 rounded-xl border border-zinc-700 p-6", className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          <span className="ml-2 text-zinc-400">Analisando gaps...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-zinc-800/50 rounded-xl border border-zinc-700 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              Analise de Gaps
            </h3>
            <p className="text-sm text-zinc-400 mt-1">
              {totalGaps === 0
                ? "Todas as secoes estao completas!"
                : `${totalGaps} secoes precisam de atencao`}
            </p>
          </div>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          )}
        </div>

        {/* Overall progress */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">
              Secoes obrigatorias completas
            </span>
            <span className="font-medium text-white">
              {completedRequired.length}/{requiredGaps.length} ({completionPercent}%)
            </span>
          </div>
          <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
            <div className="text-2xl font-bold text-red-400">{criticalGaps}</div>
            <div className="text-xs text-red-400">Criticos</div>
          </div>
          <div className="text-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <div className="text-2xl font-bold text-yellow-400">{partialGaps}</div>
            <div className="text-xs text-yellow-400">Parciais</div>
          </div>
          <div className="text-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <div className="text-2xl font-bold text-emerald-400">
              {gaps.length - totalGaps}
            </div>
            <div className="text-xs text-emerald-400">Completos</div>
          </div>
        </div>
      </div>

      {/* Gap items */}
      <div className="p-4 space-y-3">
        {/* Show only incomplete ones first */}
        {gaps
          .filter((g) => g.status !== "complete")
          .sort((a, b) => {
            if (a.isRequired && !b.isRequired) return -1;
            if (!a.isRequired && b.isRequired) return 1;
            if (a.status === "empty" && b.status !== "empty") return -1;
            if (a.status !== "empty" && b.status === "empty") return 1;
            return 0;
          })
          .map((gap) => {
            const statusDisplay = getStatusDisplay(gap);
            const StatusIcon = statusDisplay.icon;
            const isExpanded = expandedGaps.has(gap.sectionId);
            const progress = getProgressPercent(gap);

            return (
              <div
                key={gap.sectionId}
                className={cn(
                  "rounded-lg border transition-all",
                  statusDisplay.bgColor,
                  statusDisplay.borderColor
                )}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-white/5 transition-colors rounded-t-lg"
                  onClick={() => toggleExpand(gap.sectionId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <StatusIcon className={cn("h-5 w-5 mt-0.5", statusDisplay.color)} />
                      <div>
                        <h4 className="font-medium text-white">{gap.sectionName}</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge
                            className={cn(
                              "text-xs",
                              gap.isRequired
                                ? "bg-red-500/20 text-red-400 border-red-500/30"
                                : "bg-zinc-700 text-zinc-400 border-zinc-600"
                            )}
                          >
                            {gap.isRequired ? "Obrigatorio" : "Opcional"}
                          </Badge>
                          <Badge className="text-xs bg-zinc-700 text-zinc-400 border-zinc-600">
                            {gap.type}
                          </Badge>
                          {gap.segmentCount > 0 && (
                            <Badge className="text-xs bg-zinc-700 text-zinc-400 border-zinc-600">
                              {gap.segmentCount} segmentos
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {gap.status !== "complete" && onRecordSection && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRecordSection(
                              gap.sectionId,
                              gap.missingDuration || gap.suggestedDuration || 60
                            );
                          }}
                          className={cn(
                            "text-xs",
                            gap.isRequired && gap.status === "empty"
                              ? "bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                              : "bg-orange-500/20 border-orange-500/30 text-orange-400 hover:bg-orange-500/30"
                          )}
                        >
                          <Mic className="h-3 w-3 mr-1" />
                          Gravar
                        </Button>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-zinc-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-zinc-500" />
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {gap.status === "partial" && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                        <span>Progresso</span>
                        <span>
                          {formatTime(gap.currentDuration)} /{" "}
                          {formatTime(gap.suggestedDuration || 0)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-zinc-700/50"
                    >
                      <div className="p-4 space-y-4">
                        {/* Duration info */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-zinc-500" />
                            <span className="text-zinc-400">Atual:</span>
                            <span className="font-medium text-white">
                              {formatTime(gap.currentDuration)}
                            </span>
                          </div>
                          {gap.suggestedDuration && (
                            <div className="flex items-center gap-2 text-sm">
                              <ArrowRight className="h-4 w-4 text-zinc-500" />
                              <span className="text-zinc-400">Sugerido:</span>
                              <span className="font-medium text-white">
                                {formatTime(gap.suggestedDuration)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Missing duration */}
                        {gap.missingDuration > 0 && (
                          <div className="flex items-center gap-2 text-sm bg-orange-500/10 rounded-lg p-3 border border-orange-500/20">
                            <AlertTriangle className="h-4 w-4 text-orange-400" />
                            <span className="text-zinc-300">
                              Faltam aproximadamente{" "}
                              <strong className="text-orange-400">{formatTime(gap.missingDuration)}</strong> de
                              conteudo
                            </span>
                          </div>
                        )}

                        {/* Suggestion */}
                        {gap.suggestion && (
                          <div className="flex items-start gap-2 bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                            <Lightbulb className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                            <p className="text-sm text-zinc-300">{gap.suggestion}</p>
                          </div>
                        )}

                        {/* Example text */}
                        {gap.exampleText && (
                          <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-700">
                            <h5 className="text-xs font-medium text-zinc-500 mb-2">
                              Exemplo do que dizer:
                            </h5>
                            <p className="text-sm text-zinc-400 italic">
                              &ldquo;{gap.exampleText}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

        {/* Show completed sections collapsed */}
        {gaps.filter((g) => g.status === "complete").length > 0 && (
          <div className="pt-4 border-t border-zinc-700">
            <h4 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Secoes Completas ({gaps.filter((g) => g.status === "complete").length})
            </h4>
            <div className="space-y-1">
              {gaps
                .filter((g) => g.status === "complete")
                .map((gap) => (
                  <div
                    key={gap.sectionId}
                    className="flex items-center justify-between p-2 bg-emerald-500/5 rounded-lg text-sm border border-emerald-500/10"
                  >
                    <span className="text-zinc-300">{gap.sectionName}</span>
                    <div className="flex items-center gap-2">
                      <Badge className="text-xs bg-zinc-700 text-zinc-400 border-zinc-600">
                        {formatTime(gap.currentDuration)}
                      </Badge>
                      <Badge className="text-xs bg-zinc-700 text-zinc-400 border-zinc-600">
                        {gap.segmentCount} seg
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {gaps.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
            <h4 className="font-medium text-white mb-1">
              Nenhum gap encontrado!
            </h4>
            <p className="text-sm text-zinc-400">
              Todas as secoes do template estao completas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
