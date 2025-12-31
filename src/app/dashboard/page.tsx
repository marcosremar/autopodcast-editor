"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Search, Filter, X, Upload, Scissors, Sparkles, Download } from "lucide-react"
import { toast } from "sonner"
import { ProjectCard } from "@/components/dashboard/ProjectCard"
import { NewProjectButton } from "@/components/dashboard/NewProjectButton"
import { UploadModal } from "@/components/dashboard/UploadModal"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

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
  errorMessage?: string | null
}

type FilterStatus = "all" | "ready" | "processing" | "failed"
type SortOption = "recent" | "oldest" | "duration"

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")
  const [sortBy, setSortBy] = useState<SortOption>("recent")

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
      const fetchedProjects = data.projects || []
      setProjects(fetchedProjects)
    } catch (err) {
      console.error("Error fetching projects:", err)
      setError("Failed to load projects. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()

    // Setup polling interval
    pollingIntervalRef.current = setInterval(() => {
      fetchProjects()
    }, 3000)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
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

      // Show success toast
      toast.success("Projeto deletado", {
        description: "O projeto foi removido com sucesso.",
      })
    } catch (err) {
      console.error("Error deleting project:", err)
      toast.error("Erro ao deletar", {
        description: "Não foi possível deletar o projeto. Tente novamente.",
      })
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

  // Filtered and sorted projects
  const filteredProjects = useMemo(() => {
    let filtered = [...projects]

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((project) =>
        project.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (filterStatus !== "all") {
      if (filterStatus === "ready") {
        filtered = filtered.filter((p) => p.status === "ready" || p.status === "completed")
      } else if (filterStatus === "processing") {
        filtered = filtered.filter((p) =>
          ["uploading", "uploaded", "transcribing", "analyzing"].includes(p.status)
        )
      } else if (filterStatus === "failed") {
        filtered = filtered.filter((p) => p.status === "failed" || p.status === "error")
      }
    }

    // Apply sorting
    if (sortBy === "recent") {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    } else if (sortBy === "duration") {
      filtered.sort((a, b) => (b.duration || 0) - (a.duration || 0))
    }

    return filtered
  }, [projects, searchQuery, filterStatus, sortBy])

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
        {/* Search and Filters */}
        {!isLoading && !error && projects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 space-y-4"
          >
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar projetos por título..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filters and Sort */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>Filtrar:</span>
              </div>

              {/* Status Filters */}
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("all")}
              >
                Todos ({projects.length})
              </Button>
              <Button
                variant={filterStatus === "ready" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("ready")}
                className={filterStatus === "ready" ? "" : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"}
              >
                Prontos ({projects.filter((p) => p.status === "ready" || p.status === "completed").length})
              </Button>
              <Button
                variant={filterStatus === "processing" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("processing")}
                className={filterStatus === "processing" ? "" : "border-blue-500/30 text-blue-400 hover:bg-blue-500/10"}
              >
                Processando ({projects.filter((p) => ["uploading", "uploaded", "transcribing", "analyzing"].includes(p.status)).length})
              </Button>
              <Button
                variant={filterStatus === "failed" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("failed")}
                className={filterStatus === "failed" ? "" : "border-red-500/30 text-red-400 hover:bg-red-500/10"}
              >
                Falhou ({projects.filter((p) => p.status === "failed" || p.status === "error").length})
              </Button>

              {/* Divider */}
              <div className="h-6 w-px bg-border mx-2" />

              {/* Sort Options */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span>Ordenar:</span>
              </div>
              <Button
                variant={sortBy === "recent" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("recent")}
              >
                Mais recentes
              </Button>
              <Button
                variant={sortBy === "oldest" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("oldest")}
              >
                Mais antigos
              </Button>
              <Button
                variant={sortBy === "duration" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("duration")}
              >
                Maior duração
              </Button>
            </div>

            {/* Active Filters Summary */}
            {(searchQuery || filterStatus !== "all") && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Mostrando {filteredProjects.length} de {projects.length} projetos
                </span>
                {(searchQuery || filterStatus !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("")
                      setFilterStatus("all")
                    }}
                    className="h-6 px-2 text-xs"
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        )}

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
            className="text-center py-12"
          >
            <div className="max-w-3xl mx-auto">
              <div className="mb-8">
                <h2 className="text-3xl font-bold mb-3">
                  Bem-vindo ao Aeropod
                </h2>
                <p className="text-muted-foreground text-lg">
                  Edite seus podcasts com inteligência artificial em minutos
                </p>
              </div>

              {/* How it works */}
              <div className="grid md:grid-cols-4 gap-6 mb-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-card border rounded-lg p-6"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                    <Upload className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="font-semibold mb-2">1. Upload</h3>
                  <p className="text-sm text-muted-foreground">
                    Envie seu arquivo de áudio (até 500 MB)
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-card border rounded-lg p-6"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-6 w-6 text-purple-500" />
                  </div>
                  <h3 className="font-semibold mb-2">2. IA Analisa</h3>
                  <p className="text-sm text-muted-foreground">
                    Transcrição e análise automática de qualidade
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-card border rounded-lg p-6"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <Scissors className="h-6 w-6 text-emerald-500" />
                  </div>
                  <h3 className="font-semibold mb-2">3. Edite</h3>
                  <p className="text-sm text-muted-foreground">
                    Selecione os melhores segmentos facilmente
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-card border rounded-lg p-6"
                >
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                    <Download className="h-6 w-6 text-orange-500" />
                  </div>
                  <h3 className="font-semibold mb-2">4. Exporte</h3>
                  <p className="text-sm text-muted-foreground">
                    Baixe seu podcast editado em MP3
                  </p>
                </motion.div>
              </div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <NewProjectButton onClick={handleOpenModal} />
                <p className="text-xs text-muted-foreground mt-4">
                  Formatos suportados: MP3, WAV, M4A • Tempo médio de processamento: 3-5 minutos
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* No Results State (after filtering) */}
        {!isLoading && !error && projects.length > 0 && filteredProjects.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-semibold mb-2">
                Nenhum projeto encontrado
              </h2>
              <p className="text-muted-foreground mb-6">
                Tente ajustar os filtros ou a busca
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("")
                  setFilterStatus("all")
                }}
              >
                Limpar filtros
              </Button>
            </div>
          </motion.div>
        )}

        {/* Projects Grid */}
        {!isLoading && !error && projects.length > 0 && filteredProjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredProjects.map((project) => (
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
              className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Total de Projetos</p>
                <p className="text-2xl font-bold">{projects.length}</p>
              </div>
              <div className="bg-emerald-500/10 rounded-lg p-4">
                <p className="text-xs text-emerald-400 mb-1">Prontos para Editar</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {projects.filter((p) => p.status === "ready" || p.status === "completed").length}
                </p>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-4">
                <p className="text-xs text-blue-400 mb-1">Processando</p>
                <p className="text-2xl font-bold text-blue-400">
                  {
                    projects.filter((p) =>
                      ["uploading", "uploaded", "transcribing", "analyzing"].includes(
                        p.status
                      )
                    ).length
                  }
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Tempo Total de Áudio</p>
                <p className="text-2xl font-bold">
                  {Math.round(
                    projects.reduce((sum, p) => sum + (p.duration || 0), 0) / 60
                  )}m
                </p>
              </div>
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
