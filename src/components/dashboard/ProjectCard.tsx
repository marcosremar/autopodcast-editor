"use client"

import { motion } from "framer-motion"
import { Clock, Trash2 } from "lucide-react"
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
  | "transcribing"
  | "analyzing"
  | "ready"
  | "error"

interface Project {
  id: string
  title: string
  status: ProjectStatus
  duration: number
  createdAt: string
  progress?: number
}

interface ProjectCardProps {
  project: Project
  onDelete: (id: string) => void
}

const statusConfig: Record<
  ProjectStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  uploading: { variant: "secondary", label: "Uploading" },
  transcribing: { variant: "secondary", label: "Transcribing" },
  analyzing: { variant: "secondary", label: "Analyzing" },
  ready: { variant: "default", label: "Ready" },
  error: { variant: "destructive", label: "Error" },
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
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

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const statusInfo = statusConfig[project.status]
  const isProcessing = ["uploading", "transcribing", "analyzing"].includes(
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
    if (project.status === "ready") {
      router.push(`/editor/${project.id}`)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      whileHover={
        project.status === "ready" ? { scale: 1.02, transition: { duration: 0.2 } } : {}
      }
    >
      <Card
        className={`relative transition-all ${
          project.status === "ready"
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
                  Processing...
                </span>
                <span className="font-medium">{project.progress}%</span>
              </div>
              <Progress value={project.progress} />
            </div>
          </CardContent>
        )}
      </Card>
    </motion.div>
  )
}
