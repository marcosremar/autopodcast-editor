"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Loader2, Sparkles, Grid3x3 } from "lucide-react"
import { TemplateCard } from "./TemplateCard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TemplateSection {
  id: string
  name: string
  description?: string
  isRequired: boolean
  type: string
  suggestedDuration?: number
  icon?: string
  color?: string
}

interface Template {
  id: string
  name: string
  description?: string
  category: string
  estimatedDuration?: number
  sections?: TemplateSection[]
}

interface TemplateSuggestion {
  template: Template
  matchScore: number
  reason: string
}

interface TemplateSelectorProps {
  projectId: string
  suggestedTemplates?: TemplateSuggestion[]
  onTemplateSelect: (templateId: string) => Promise<void>
}

export function TemplateSelector({
  projectId,
  suggestedTemplates = [],
  onTemplateSelect,
}: TemplateSelectorProps) {
  const [allTemplates, setAllTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    try {
      const response = await fetch("/api/templates")
      const data = await response.json()

      if (data.success) {
        setAllTemplates(data.templates)
      }
    } catch (error) {
      console.error("Failed to load templates:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSelect(templateId: string) {
    setSelecting(templateId)
    try {
      await onTemplateSelect(templateId)
    } catch (error) {
      console.error("Failed to select template:", error)
      setSelecting(null)
    }
  }

  // Separate suggested and other templates
  const suggestedTemplateIds = new Set(
    suggestedTemplates.map((s) => s.template.id)
  )
  const otherTemplates = allTemplates.filter(
    (t) => !suggestedTemplateIds.has(t.id)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Suggested Templates Section */}
      {suggestedTemplates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <h2 className="text-xl font-semibold">Templates Recomendados</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Com base no conteúdo do seu podcast, sugerimos estes templates:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestedTemplates.map((suggestion) => (
              <TemplateCard
                key={suggestion.template.id}
                template={suggestion.template}
                isRecommended
                matchScore={suggestion.matchScore}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Templates Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Grid3x3 className="h-5 w-5" />
          <h2 className="text-xl font-semibold">
            {suggestedTemplates.length > 0
              ? "Todos os Templates"
              : "Templates Disponíveis"}
          </h2>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="interview">Entrevista</TabsTrigger>
            <TabsTrigger value="monologue">Monólogo</TabsTrigger>
            <TabsTrigger value="debate">Debate</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </TabsContent>

          {["interview", "monologue", "debate", "review"].map((category) => (
            <TabsContent key={category} value={category} className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherTemplates
                  .filter((t) => t.category === category)
                  .map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={handleSelect}
                    />
                  ))}
              </div>
              {otherTemplates.filter((t) => t.category === category).length ===
                0 && (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum template encontrado nesta categoria
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Loading overlay when selecting */}
      {selecting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <div className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm font-medium">Aplicando template...</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
