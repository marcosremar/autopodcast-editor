"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2 } from "lucide-react"
import { ProjectCard } from "@/components/dashboard/ProjectCard"
import { NewProjectButton } from "@/components/dashboard/NewProjectButton"
import { UploadModal } from "@/components/dashboard/UploadModal"

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

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch projects from API
  const fetchProjects = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/projects")

      if (!response.ok) {
        throw new Error("Failed to fetch projects")
      }

      const data = await response.json()
      setProjects(data.projects || [])
    } catch (err) {
      console.error("Error fetching projects:", err)
      setError("Failed to load projects. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  // Handle project deletion
  const handleDeleteProject = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete project")
      }

      // Remove project from state
      setProjects((prev) => prev.filter((project) => project.id !== id))
    } catch (err) {
      console.error("Error deleting project:", err)
      throw err
    }
  }

  // Handle successful upload
  const handleUploadSuccess = () => {
    fetchProjects()
  }

  // Handle opening modal
  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  // Handle closing modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard v2</h1>
              <p className="text-muted-foreground mt-1">
                Manage your podcast projects
              </p>
            </div>
            <NewProjectButton onClick={handleOpenModal} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <p className="text-destructive mb-4">{error}</p>
            <button
              onClick={fetchProjects}
              className="text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && !error && projects.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-semibold mb-2">
                No projects yet
              </h2>
              <p className="text-muted-foreground mb-6">
                Get started by creating your first podcast project
              </p>
              <NewProjectButton onClick={handleOpenModal} />
            </div>
          </motion.div>
        )}

        {/* Projects Grid */}
        {!isLoading && !error && projects.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onDelete={handleDeleteProject}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Project Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-8 flex items-center gap-6 text-sm text-muted-foreground"
            >
              <span>
                Total projects: <strong>{projects.length}</strong>
              </span>
              <span>
                Ready:{" "}
                <strong>
                  {projects.filter((p) => p.status === "ready").length}
                </strong>
              </span>
              <span>
                Processing:{" "}
                <strong>
                  {
                    projects.filter((p) =>
                      ["uploading", "transcribing", "analyzing"].includes(
                        p.status
                      )
                    ).length
                  }
                </strong>
              </span>
            </motion.div>
          </motion.div>
        )}
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  )
}
