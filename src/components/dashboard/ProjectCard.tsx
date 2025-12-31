"use client"

import { motion } from "framer-motion"
import { Clock, Trash2, Timer } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

type ProjectStatus =
  | "uploading"
  | "uploaded"
  | "transcribing"
  | "analyzing"
  | "ready"
  | "completed"
  | "failed"
  | "error"

interface Project {
  id: string
  title: string
  status: ProjectStatus
  duration: number
  createdAt: string
  progress?: number
  errorMessage?: string | null
}

interface ProjectCardProps {
  project: Project
  onDelete: (id: string) => void
}

const statusConfig: Record<
  ProjectStatus,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    label: string;
    description?: string;
  }
> = {
  uploading: {
    variant: "secondary",
    label: "Uploading",
    description: "Enviando arquivo de áudio..."
  },
  uploaded: {
    variant: "secondary",
    label: "Processing",
    description: "Preparando para transcrição..."
  },
  transcribing: {
    variant: "secondary",
    label: "Transcribing",
    description: "Convertendo áudio em texto com IA..."
  },
  analyzing: {
    variant: "secondary",
    label: "Analyzing",
    description: "Analisando segmentos e qualidade..."
  },
  ready: {
    variant: "default",
    label: "Ready",
    description: "Pronto para editar"
  },
  completed: {
    variant: "default",
    label: "Completed",
    description: "Processamento concluído"
  },
  failed: {
    variant: "destructive",
    label: "Failed",
    description: "Falha no processamento"
  },
  error: {
    variant: "destructive",
    label: "Error",
    description: "Erro durante processamento"
  },
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || isNaN(seconds)) return "0:00"
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInDays === 0) {
    return "Today"
  } else if (diffInDays === 1) {
    return "Yesterday"
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }
}

function getEstimatedTimeRemaining(status: ProjectStatus, progress: number = 0, duration: number = 0): string | null {
  // Base estimates in seconds per minute of audio
  const estimates = {
    uploading: 5, // ~5 seconds
    uploaded: 10, // ~10 seconds
    transcribing: 30, // ~30 seconds per minute
    analyzing: 15, // ~15 seconds per minute
  }

  if (!["uploading", "uploaded", "transcribing", "analyzing"].includes(status)) {
    return null
  }

  // Calculate base time estimate
  let baseEstimate = estimates[status as keyof typeof estimates] || 30

  // For transcribing and analyzing, scale by duration
  if ((status === "transcribing" || status === "analyzing") && duration > 0) {
    const minutes = Math.ceil(duration / 60)
    baseEstimate = baseEstimate * minutes
  } else {
    // Default estimate if no duration
    baseEstimate = status === "uploading" ? 5 : 30
  }

  // Calculate remaining based on progress
  const remaining = baseEstimate * ((100 - progress) / 100)

  if (remaining < 10) {
    return "menos de 10 segundos"
  } else if (remaining < 60) {
    return `~${Math.ceil(remaining / 10) * 10} segundos`
  } else {
    const minutes = Math.ceil(remaining / 60)
    return `~${minutes} ${minutes === 1 ? "minuto" : "minutos"}`
  }
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const statusInfo = statusConfig[project.status as ProjectStatus] || { variant: "outline" as const, label: project.status || "Unknown" }
  const isProcessing = ["uploading", "uploaded", "transcribing", "analyzing"].includes(
    project.status
  )

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm("Are you sure you want to delete this project?")) {
      return
    }

    setIsDeleting(true)
    try {
      await onDelete(project.id)
    } catch (error) {
      console.error("Failed to delete project:", error)
      setIsDeleting(false)
    }
  }

  const handleClick = () => {
    if (project.status === "ready" || project.status === "completed") {
      router.push(`/editor/${project.id}`)
    }
  }

  const isClickable = project.status === "ready" || project.status === "completed"

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      whileHover={
        isClickable ? { scale: 1.02, transition: { duration: 0.2 } } : {}
      }
    >
      <Card
        className={`relative transition-all ${
          isClickable
            ? "cursor-pointer hover:shadow-lg"
            : "opacity-75"
        } ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}
        onClick={handleClick}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="truncate">{project.title}</CardTitle>
              <CardDescription className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(project.duration)}
                </span>
                <span>{formatDate(project.createdAt)}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {isProcessing && project.progress !== undefined && (
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {statusInfo.description || "Processing..."}
                </span>
                <span className="font-medium">{project.progress}%</span>
              </div>
              <Progress value={project.progress} />
              <div className="flex items-center justify-between text-xs">
                {project.status === "analyzing" ? (
                  <p className="text-muted-foreground">
                    Avaliando interesse, clareza e qualidade
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    {statusInfo.description}
                  </p>
                )}
                {getEstimatedTimeRemaining(project.status as ProjectStatus, project.progress, project.duration) && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Timer className="h-3 w-3" />
                    {getEstimatedTimeRemaining(project.status as ProjectStatus, project.progress, project.duration)}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        )}

        {(project.status === "failed" || project.status === "error") && project.errorMessage && (
          <CardContent>
            <div className="rounded-md bg-destructive/10 p-3">
              <p className="text-sm text-destructive font-medium mb-1">
                Processing Failed
              </p>
              <p className="text-xs text-destructive/80">
                {project.errorMessage}
              </p>
            </div>
          </CardContent>
        )}

        {(project.status === "ready" || project.status === "completed") && project.duration && (
          <CardContent className="pt-0">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Ready to edit</span>
              {project.duration > 0 && (
                <span className="ml-2">
                  • {formatDuration(project.duration)} of audio
                </span>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </motion.div>
  )
}
