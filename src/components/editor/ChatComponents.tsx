"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wand2,
  Mic,
  Play,
  Download,
  LayoutTemplate,
  Clock,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types for rich chat components
export interface TemplateSection {
  id: string;
  name: string;
  status: "empty" | "partial" | "complete";
  duration: number;
  targetDuration: number;
  isRequired: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: "wand" | "mic" | "play" | "download" | "template";
  variant: "primary" | "secondary" | "danger";
  action: string;
}

export interface ChatComponentData {
  type: "template_status" | "quick_actions" | "progress_card" | "section_card";
  data: any;
}

// Helper functions
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "complete":
      return CheckCircle2;
    case "partial":
      return AlertTriangle;
    default:
      return XCircle;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "complete":
      return "text-emerald-400";
    case "partial":
      return "text-yellow-400";
    default:
      return "text-red-400";
  }
}

// Template Status Card - Shows all sections status
export function TemplateStatusCard({
  templateName,
  sections,
  onSectionClick,
}: {
  templateName: string;
  sections: TemplateSection[];
  onSectionClick?: (sectionId: string) => void;
}) {
  const completedCount = sections.filter((s) => s.status === "complete").length;
  const progress = Math.round((completedCount / sections.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-800/80 rounded-xl border border-zinc-700 overflow-hidden my-3"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-700 bg-zinc-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-white">{templateName}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-20 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-zinc-400">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Sections List */}
      <div className="divide-y divide-zinc-700/50">
        {sections.map((section, index) => {
          const StatusIcon = getStatusIcon(section.status);
          const statusColor = getStatusColor(section.status);

          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSectionClick?.(section.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 transition-colors",
                onSectionClick && "cursor-pointer hover:bg-zinc-700/30"
              )}
            >
              <StatusIcon className={cn("h-4 w-4 shrink-0", statusColor)} />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-zinc-300">{section.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">
                  {formatTime(section.duration)} / {formatTime(section.targetDuration)}
                </span>
                {section.isRequired && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                    Obrig.
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Quick Actions - Horizontal buttons
export function QuickActionsBar({
  actions,
  onAction,
}: {
  actions: QuickAction[];
  onAction: (actionId: string) => void;
}) {
  const iconMap = {
    wand: Wand2,
    mic: Mic,
    play: Play,
    download: Download,
    template: LayoutTemplate,
  };

  const variantStyles = {
    primary: "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30",
    secondary: "bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300 border-zinc-600",
    danger: "bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2 my-3"
    >
      {actions.map((action, index) => {
        const Icon = iconMap[action.icon];
        return (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onAction(action.action)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
              variantStyles[action.variant]
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{action.label}</span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

// Progress Card - Shows overall progress with stats
export function ProgressCard({
  title,
  stats,
}: {
  title: string;
  stats: { label: string; value: string; trend?: "up" | "down" | "neutral" }[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-zinc-800/80 to-zinc-800/50 rounded-xl border border-zinc-700 p-4 my-3"
    >
      <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-emerald-400" />
        {title}
      </h4>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <div className="text-lg font-bold text-white">{stat.value}</div>
            <div className="text-xs text-zinc-500">{stat.label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Section Detail Card - For when user asks about a specific section
export function SectionDetailCard({
  section,
  suggestion,
  onRecord,
  onAutoFill,
}: {
  section: TemplateSection & { description?: string };
  suggestion?: string;
  onRecord?: () => void;
  onAutoFill?: () => void;
}) {
  const StatusIcon = getStatusIcon(section.status);
  const statusColor = getStatusColor(section.status);
  const progress = Math.min(100, Math.round((section.duration / section.targetDuration) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-800/80 rounded-xl border border-zinc-700 overflow-hidden my-3"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-700">
        <div className="flex items-center gap-3">
          <StatusIcon className={cn("h-5 w-5", statusColor)} />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-white">{section.name}</h4>
            {section.description && (
              <p className="text-xs text-zinc-500 mt-0.5">{section.description}</p>
            )}
          </div>
          {section.isRequired && (
            <span className="text-[10px] px-2 py-1 bg-red-500/20 text-red-400 rounded">
              Obrigatorio
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Progresso</span>
          <span className="text-zinc-300">
            {formatTime(section.duration)} / {formatTime(section.targetDuration)}
          </span>
        </div>
        <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              section.status === "complete" && "bg-emerald-500",
              section.status === "partial" && "bg-yellow-500",
              section.status === "empty" && "bg-red-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Suggestion */}
      {suggestion && section.status !== "complete" && (
        <div className="px-4 py-2 bg-zinc-900/50 border-t border-zinc-700">
          <p className="text-xs text-zinc-400">
            <span className="text-emerald-400 font-medium">Sugestao:</span> {suggestion}
          </p>
        </div>
      )}

      {/* Actions */}
      {(onRecord || onAutoFill) && section.status !== "complete" && (
        <div className="px-4 py-3 border-t border-zinc-700 flex gap-2">
          {onRecord && (
            <button
              onClick={onRecord}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm transition-colors"
            >
              <Mic className="h-4 w-4" />
              Gravar
            </button>
          )}
          {onAutoFill && (
            <button
              onClick={onAutoFill}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
            >
              <Wand2 className="h-4 w-4" />
              Auto-preencher
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Gap Analysis Card - Shows what's missing
export function GapAnalysisCard({
  gaps,
  onFillGap,
}: {
  gaps: { sectionName: string; missingDuration: number; suggestion: string }[];
  onFillGap?: (sectionName: string) => void;
}) {
  if (gaps.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-emerald-500/10 rounded-xl border border-emerald-500/30 p-4 my-3"
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          <div>
            <h4 className="text-sm font-medium text-emerald-400">Tudo completo!</h4>
            <p className="text-xs text-zinc-400">
              Todas as secoes obrigatorias estao preenchidas.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-800/80 rounded-xl border border-zinc-700 overflow-hidden my-3"
    >
      <div className="px-4 py-3 border-b border-zinc-700 bg-yellow-500/10">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <span className="text-sm font-medium text-yellow-400">
            {gaps.length} secoes precisam de conteudo
          </span>
        </div>
      </div>
      <div className="divide-y divide-zinc-700/50">
        {gaps.map((gap, index) => (
          <div
            key={index}
            className="px-4 py-3 flex items-center gap-3"
          >
            <Clock className="h-4 w-4 text-zinc-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-zinc-300">{gap.sectionName}</div>
              <div className="text-xs text-zinc-500">
                Faltam {formatTime(gap.missingDuration)}
              </div>
            </div>
            {onFillGap && (
              <button
                onClick={() => onFillGap(gap.sectionName)}
                className="flex items-center gap-1 px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded text-xs transition-colors"
              >
                <Mic className="h-3 w-3" />
                Gravar
              </button>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Compact Mini Timeline - Shows segment distribution
export function MiniTimeline({
  segments,
  totalDuration,
}: {
  segments: { id: string; start: number; end: number; status: "selected" | "available" | "mapped" }[];
  totalDuration: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-800/80 rounded-xl border border-zinc-700 p-4 my-3"
    >
      <h4 className="text-xs font-medium text-zinc-400 mb-2">Timeline</h4>
      <div className="h-6 bg-zinc-900 rounded-lg overflow-hidden relative">
        {segments.map((seg) => {
          const left = (seg.start / totalDuration) * 100;
          const width = ((seg.end - seg.start) / totalDuration) * 100;
          return (
            <div
              key={seg.id}
              className={cn(
                "absolute top-0 h-full",
                seg.status === "selected" && "bg-emerald-500",
                seg.status === "available" && "bg-zinc-600",
                seg.status === "mapped" && "bg-blue-500"
              )}
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-zinc-600">0:00</span>
        <span className="text-[10px] text-zinc-600">{formatTime(totalDuration)}</span>
      </div>
    </motion.div>
  );
}
