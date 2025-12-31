"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Upload,
  CheckCheck,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"

interface Section {
  id: string
  name: string
  order: number
  status: string
  audioUrl?: string
  duration?: number
  notes?: string
  templateSection?: {
    isRequired: boolean
    suggestedDuration?: number
    description?: string
    exampleText?: string
    icon?: string
    color?: string
  }
}

interface SectionManagerProps {
  projectId: string
}

const statusIcons = {
  pending: Circle,
  processing: Clock,
  review: AlertCircle,
  approved: CheckCircle2,
  blocked: AlertCircle,
}

const statusColors = {
  pending: "text-gray-400",
  processing: "text-blue-500",
  review: "text-yellow-500",
  approved: "text-green-500",
  blocked: "text-red-500",
}

export function SectionManager({ projectId }: SectionManagerProps) {
  const [sections, setSections] = useState<Section[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    loadSections()
  }, [projectId])

  async function loadSections() {
    try {
      const [sectionsRes, statsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/sections`),
        fetch(`/api/projects/${projectId}/missing-sections`),
      ])

      const sectionsData = await sectionsRes.json()
      const statsData = await statsRes.json()

      if (sectionsData.success) {
        setSections(sectionsData.sections)
      }

      if (statsData.success) {
        setStats(statsData.stats)
      }
    } catch (error) {
      console.error("Failed to load sections:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(sectionId: string) {
    setUpdating(sectionId)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/sections/${sectionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        }
      )

      if (response.ok) {
        await loadSections()
      }
    } catch (error) {
      console.error("Failed to approve section:", error)
    } finally {
      setUpdating(null)
    }
  }

  async function handleReview(sectionId: string) {
    setUpdating(sectionId)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/sections/${sectionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "review" }),
        }
      )

      if (response.ok) {
        await loadSections()
      }
    } catch (error) {
      console.error("Failed to update section:", error)
    } finally {
      setUpdating(null)
    }
  }

  function formatDuration(seconds?: number): string {
    if (!seconds) return "N/A"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando seções...</div>
  }

  return (
    <div className="space-y-6">
      {/* Progress Stats */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progresso das Seções</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Seções Aprovadas</span>
                <span className="font-medium">
                  {stats.approved} / {stats.total}
                </span>
              </div>
              <Progress value={stats.percentComplete} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Obrigatórias</div>
                <div className="font-medium">
                  {stats.requiredApproved} / {stats.required}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Pendentes</div>
                <div className="font-medium">{stats.pending}</div>
              </div>
            </div>

            {stats.isReadyForExport && (
              <Badge variant="default" className="w-full justify-center">
                <CheckCheck className="h-4 w-4 mr-2" />
                Pronto para exportar
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sections List */}
      <div className="space-y-3">
        {sections.map((section) => {
          const StatusIcon = statusIcons[section.status as keyof typeof statusIcons] || Circle
          const statusColor = statusColors[section.status as keyof typeof statusColors] || "text-gray-400"
          const isRequired = section.templateSection?.isRequired
          const isApproved = section.status === "approved"

          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <StatusIcon className={`h-5 w-5 mt-1 ${statusColor}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium">{section.name}</h3>
                        {isRequired && (
                          <Badge variant="secondary" className="text-xs">
                            Obrigatória
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {section.status}
                        </Badge>
                      </div>

                      {section.templateSection?.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {section.templateSection.description}
                        </p>
                      )}

                      {section.audioUrl && (
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">
                            Duração: {formatDuration(section.duration)}
                          </span>
                        </div>
                      )}

                      {section.notes && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <strong>Notas:</strong> {section.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {!isApproved && section.audioUrl && (
                        <Button
                          size="sm"
                          onClick={() => handleApprove(section.id)}
                          disabled={updating === section.id}
                        >
                          {updating === section.id ? "..." : "Aprovar"}
                        </Button>
                      )}

                      {isApproved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview(section.id)}
                          disabled={updating === section.id}
                        >
                          Reabrir
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
