"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Project, Segment } from "@/lib/db/schema";
import { Timeline } from "@/components/editor/Timeline";
import { AudioPlayer } from "@/components/editor/AudioPlayer";
import { ExportButton } from "@/components/editor/ExportButton";
import { RemovedSegments } from "@/components/editor/RemovedSegments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileAudio,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

export default function EditorPage({ params }: EditorPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch project and segments
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/projects/${resolvedParams.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch project");
        }

        const data = await response.json();
        setProject(data.project);
        setSegments(data.segments);
      } catch (err) {
        console.error("Error fetching project:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load project"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [resolvedParams.id]);

  // Auto-save when segments change
  useEffect(() => {
    if (!project || segments.length === 0 || isLoading) return;

    const saveChanges = async () => {
      setIsSaving(true);
      try {
        const selectedSegmentIds = segments
          .filter((s) => s.isSelected)
          .map((s) => s.id);

        const segmentOrder = segments
          .filter((s) => s.isSelected)
          .map((s, index) => ({
            segmentId: s.id,
            order: index,
          }));

        await fetch(`/api/projects/${resolvedParams.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedSegments: selectedSegmentIds,
            segmentOrder,
          }),
        });
      } catch (err) {
        console.error("Error saving changes:", err);
      } finally {
        setIsSaving(false);
      }
    };

    const debounce = setTimeout(saveChanges, 1000);
    return () => clearTimeout(debounce);
  }, [segments, project, resolvedParams.id, isLoading]);

  const handleReorder = (newOrder: Segment[]) => {
    const updatedSegments = segments.map((seg) => {
      const newIndex = newOrder.findIndex((s) => s.id === seg.id);
      if (newIndex !== -1) {
        return { ...seg, order: newIndex };
      }
      return seg;
    });
    setSegments(updatedSegments);
  };

  const handleToggleSelect = (segmentId: string) => {
    setSegments((prev) =>
      prev.map((seg) =>
        seg.id === segmentId ? { ...seg, isSelected: !seg.isSelected } : seg
      )
    );
  };

  const handlePlaySegment = (segment: Segment) => {
    // In a real implementation, this would construct the audio URL for the segment
    // For now, we'll use the project's original audio
    setCurrentAudioUrl(project?.originalAudioUrl || null);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            {status}
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Error Loading Project
          </h2>
          <p className="mt-2 text-gray-600">{error || "Project not found"}</p>
          <Button
            className="mt-6"
            onClick={() => router.push("/dashboard")}
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const selectedCount = segments.filter((s) => s.isSelected).length;
  const selectedDuration = segments
    .filter((s) => s.isSelected)
    .reduce((sum, seg) => sum + (seg.endTime - seg.startTime), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {project.title || "Untitled Podcast"}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {getStatusBadge(project.status)}
                {project.originalDuration && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Original: {formatDuration(project.originalDuration)}
                  </Badge>
                )}
                {project.targetDuration && (
                  <Badge variant="outline" className="gap-1">
                    <FileAudio className="h-3 w-3" />
                    Target: {formatDuration(project.targetDuration)}
                  </Badge>
                )}
                {isSaving && (
                  <Badge variant="secondary" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main content */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left column - Timeline */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Timeline
                </h2>
                <p className="text-sm text-gray-600">
                  Drag to reorder segments. Click checkbox to add/remove.
                </p>
              </div>

              <Timeline
                segments={segments}
                onReorder={handleReorder}
                onToggleSelect={handleToggleSelect}
                onPlaySegment={handlePlaySegment}
              />
            </motion.div>

            {/* Removed segments */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <RemovedSegments
                segments={segments}
                onToggleSelect={handleToggleSelect}
                onPlaySegment={handlePlaySegment}
              />
            </motion.div>
          </div>

          {/* Right column - Audio player and export */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="sticky top-8"
            >
              {/* Stats card */}
              <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
                <h3 className="mb-4 font-semibold text-gray-900">
                  Project Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      Total Segments:
                    </span>
                    <span className="font-semibold">{segments.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Selected:</span>
                    <span className="font-semibold text-blue-600">
                      {selectedCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      Selected Duration:
                    </span>
                    <span className="font-semibold text-blue-600">
                      {formatDuration(selectedDuration)}
                    </span>
                  </div>
                  {project.targetDuration && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        vs Target:
                      </span>
                      <span
                        className={cn(
                          "font-semibold",
                          selectedDuration <= project.targetDuration
                            ? "text-green-600"
                            : "text-orange-600"
                        )}
                      >
                        {selectedDuration <= project.targetDuration
                          ? "Within target"
                          : `+${formatDuration(
                              selectedDuration - project.targetDuration
                            )}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Audio player */}
              <AudioPlayer
                audioUrl={currentAudioUrl || project.originalAudioUrl}
                title={currentAudioUrl ? "Segment Preview" : "Full Podcast"}
                className="mb-6"
              />

              {/* Export button */}
              <ExportButton
                projectId={project.id}
                selectedSegmentsCount={selectedCount}
              />

              {/* Help text */}
              <div className="mt-4 rounded-lg bg-blue-50 p-4 text-xs text-blue-700">
                <strong>Need help?</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Drag segments to reorder the timeline</li>
                  <li>Click play to preview individual segments</li>
                  <li>Check/uncheck to add/remove segments</li>
                  <li>Export when you&apos;re happy with the result</li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
