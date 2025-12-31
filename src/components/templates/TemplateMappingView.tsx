"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wand2,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types for the component
interface SectionSegment {
  id: string;
  title: string;
  summary: string;
  duration: number;
  confidence: number;
}

interface Section {
  id: string;
  name: string;
  type: string;
  description: string;
  minDuration: number;
  maxDuration: number | null;
  suggestedDuration: number;
  isRequired: boolean;
  order: number;
  segments: SectionSegment[];
  totalDuration: number;
  status: "empty" | "partial" | "complete";
}

interface UnmappedSegment {
  id: string;
  title: string;
  summary: string;
  duration: number;
  topics?: string[];
}

interface TemplateMappingViewProps {
  projectId: string;
  sections?: Section[];
  unmappedSegments?: UnmappedSegment[];
  onAutoMap?: () => void;
  isAutoMapping?: boolean;
  onPlaySegment?: (segmentId: string) => void;
  // Legacy props (ignored but accepted for compatibility)
  templateId?: string;
  segments?: any[];
  onPlay?: any;
  onRecordSection?: any;
  onMappingChange?: any;
  onAssignSegment?: any;
  onRemoveSegment?: any;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getStatusIcon(status: string, isRequired: boolean) {
  if (status === "complete") return CheckCircle2;
  if (status === "partial") return AlertTriangle;
  return isRequired ? XCircle : AlertTriangle;
}

function getStatusColor(status: string, isRequired: boolean) {
  if (status === "complete") return "text-emerald-400";
  if (status === "partial") return "text-yellow-400";
  return isRequired ? "text-red-400" : "text-zinc-500";
}

function getStatusBgColor(status: string, isRequired: boolean) {
  if (status === "complete") return "bg-emerald-500/10";
  if (status === "partial") return "bg-yellow-500/10";
  return isRequired ? "bg-red-500/10" : "bg-zinc-800/50";
}

function getStatusBorderColor(status: string, isRequired: boolean) {
  if (status === "complete") return "border-emerald-500/30";
  if (status === "partial") return "border-yellow-500/30";
  return isRequired ? "border-red-500/30" : "border-zinc-700";
}

export function TemplateMappingView({
  projectId,
  sections = [],
  unmappedSegments = [],
  onAutoMap,
  isAutoMapping = false,
  onPlaySegment,
}: TemplateMappingViewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.filter(s => s.segments.length > 0).map(s => s.id))
  );
  const [playingSegment, setPlayingSegment] = useState<string | null>(null);

  const toggleSectionExpand = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Calculate stats
  const mappedCount = sections.reduce((sum, s) => sum + s.segments.length, 0);
  const completeSections = sections.filter(s => s.status === "complete").length;
  const partialSections = sections.filter(s => s.status === "partial").length;
  const emptySections = sections.filter(s => s.status === "empty").length;
  const totalDuration = sections.reduce((sum, s) => sum + s.totalDuration, 0);

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Resultado do Mapeamento</h2>
            <p className="text-sm text-zinc-400">
              {mappedCount} segmentos mapeados automaticamente
            </p>
          </div>
          {onAutoMap && (
            <Button
              onClick={onAutoMap}
              disabled={isAutoMapping}
              className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white"
            >
              {isAutoMapping ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Remapear com IA
            </Button>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <div className="text-2xl font-bold text-emerald-400">{completeSections}</div>
            <div className="text-xs text-emerald-400">Completos</div>
          </div>
          <div className="text-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <div className="text-2xl font-bold text-yellow-400">{partialSections}</div>
            <div className="text-xs text-yellow-400">Parciais</div>
          </div>
          <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
            <div className="text-2xl font-bold text-red-400">{emptySections}</div>
            <div className="text-xs text-red-400">Vazios</div>
          </div>
          <div className="text-center p-3 bg-zinc-700/50 rounded-lg border border-zinc-600">
            <div className="text-2xl font-bold text-zinc-300">{formatTime(totalDuration)}</div>
            <div className="text-xs text-zinc-400">Duracao Total</div>
          </div>
        </div>
      </div>

      {/* Sections List */}
      <div className="space-y-3">
        {sections.map((section) => {
          const StatusIcon = getStatusIcon(section.status, section.isRequired);
          const statusColor = getStatusColor(section.status, section.isRequired);
          const statusBgColor = getStatusBgColor(section.status, section.isRequired);
          const borderColor = getStatusBorderColor(section.status, section.isRequired);
          const isExpanded = expandedSections.has(section.id);
          const progressPercent = section.suggestedDuration > 0
            ? Math.min(100, Math.round((section.totalDuration / section.suggestedDuration) * 100))
            : 0;

          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-xl border transition-all overflow-hidden",
                statusBgColor,
                borderColor
              )}
            >
              {/* Section Header */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => toggleSectionExpand(section.id)}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  statusBgColor
                )}>
                  <StatusIcon className={cn("h-5 w-5", statusColor)} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium">
                      {section.order}. {section.name}
                    </span>
                    {section.isRequired && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-red-500/20 text-red-400 border-red-500/30">
                        Obrigatorio
                      </Badge>
                    )}
                    <Badge className="text-[10px] px-1.5 py-0 bg-zinc-700 text-zinc-400 border-zinc-600">
                      {section.type}
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          section.status === "complete" ? "bg-emerald-500" :
                          section.status === "partial" ? "bg-yellow-500" : "bg-zinc-600"
                        )}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 shrink-0">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(section.totalDuration)}</span>
                      <span className="text-zinc-600">/</span>
                      <span>{formatTime(section.suggestedDuration)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {section.segments.length > 0 && (
                    <Badge className="text-xs bg-zinc-700 text-zinc-300 border-zinc-600">
                      {section.segments.length} seg
                    </Badge>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-zinc-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-zinc-500" />
                  )}
                </div>
              </div>

              {/* Section Content (expanded) */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-zinc-700/50">
                  {section.description && (
                    <p className="text-sm text-zinc-400 mt-3 mb-3">{section.description}</p>
                  )}

                  {section.segments.length > 0 ? (
                    <div className="space-y-2 mt-3">
                      {section.segments.map((segment, idx) => (
                        <div
                          key={segment.id}
                          className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-700"
                        >
                          <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-zinc-300 truncate">
                              {segment.title || segment.summary || "Segmento"}
                            </p>
                            {segment.summary && segment.title && (
                              <p className="text-xs text-zinc-500 truncate mt-0.5">
                                {segment.summary}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge className="text-xs bg-zinc-700 text-zinc-400 border-zinc-600">
                              {formatTime(segment.duration)}
                            </Badge>
                            {segment.confidence > 0 && (
                              <div className="text-xs text-emerald-400">
                                {Math.round(segment.confidence * 100)}%
                              </div>
                            )}
                            {onPlaySegment && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (playingSegment === segment.id) {
                                    setPlayingSegment(null);
                                  } else {
                                    setPlayingSegment(segment.id);
                                    onPlaySegment(segment.id);
                                  }
                                }}
                              >
                                {playingSegment === segment.id ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 p-4 border border-dashed border-zinc-700 rounded-lg text-center">
                      <p className="text-sm text-zinc-500">
                        Nenhum segmento mapeado para esta secao
                      </p>
                      <p className="text-xs text-zinc-600 mt-1">
                        Use o painel de gaps para gravar conteudo
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Unmapped Segments Info */}
      {unmappedSegments.length > 0 && (
        <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            Segmentos nao mapeados ({unmappedSegments.length})
          </h3>
          <p className="text-xs text-zinc-500 mb-3">
            Estes segmentos nao se encaixaram automaticamente em nenhuma secao do template.
            Eles serao incluidos no final do podcast ou podem ser descartados.
          </p>
          <div className="space-y-2">
            {unmappedSegments.slice(0, 5).map((segment) => (
              <div
                key={segment.id}
                className="flex items-center gap-3 p-2 bg-zinc-900/50 rounded-lg border border-zinc-700"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-400 truncate">
                    {segment.title || segment.summary || "Segmento"}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-500">
                  {formatTime(segment.duration)}
                </Badge>
              </div>
            ))}
            {unmappedSegments.length > 5 && (
              <p className="text-xs text-zinc-500 text-center pt-2">
                +{unmappedSegments.length - 5} segmentos adicionais
              </p>
            )}
          </div>
        </div>
      )}

      {/* All Mapped Success State */}
      {unmappedSegments.length === 0 && sections.every(s => s.status === "complete") && (
        <div className="bg-emerald-500/10 rounded-xl border border-emerald-500/20 p-6 text-center">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-400" />
          <h3 className="text-lg font-medium text-emerald-400 mb-1">
            Mapeamento Completo!
          </h3>
          <p className="text-sm text-zinc-400">
            Todos os segmentos foram mapeados com sucesso para as secoes do template.
          </p>
        </div>
      )}
    </div>
  );
}
