"use client"

import { motion } from "framer-motion"
import { Clock, Check, Circle, Sparkles } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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

interface TemplateCardProps {
  template: Template
  isRecommended?: boolean
  matchScore?: number
  onSelect: (templateId: string) => void
}

const categoryColors: Record<string, string> = {
  interview: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  monologue: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  debate: "bg-red-500/10 text-red-700 dark:text-red-300",
  review: "bg-green-500/10 text-green-700 dark:text-green-300",
  educational: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
}

const categoryLabels: Record<string, string> = {
  interview: "Entrevista",
  monologue: "Monólogo",
  debate: "Debate",
  review: "Review",
  educational: "Educacional",
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "Duração flexível"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `~${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `~${hours}h ${remainingMinutes}m`
}

export function TemplateCard({
  template,
  isRecommended = false,
  matchScore,
  onSelect,
}: TemplateCardProps) {
  const requiredSections =
    template.sections?.filter((s) => s.isRequired).length || 0
  const optionalSections =
    template.sections?.filter((s) => !s.isRequired).length || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    >
      <Card className="relative h-full cursor-pointer hover:shadow-lg transition-all">
        {isRecommended && (
          <div className="absolute -top-2 -right-2 z-10">
            <Badge
              variant="default"
              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white flex items-center gap-1 shadow-lg"
            >
              <Sparkles className="h-3 w-3" />
              Recomendado
              {matchScore && (
                <span className="ml-1 opacity-90">
                  {Math.round(matchScore * 100)}%
                </span>
              )}
            </Badge>
          </div>
        )}

        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription className="mt-1">
                {template.description}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Badge
              variant="secondary"
              className={categoryColors[template.category] || ""}
            >
              {categoryLabels[template.category] || template.category}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDuration(template.estimatedDuration)}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Sections Overview */}
          {template.sections && template.sections.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Seções do template:</span>
                <span className="text-muted-foreground">
                  {requiredSections} obrigatórias, {optionalSections} opcionais
                </span>
              </div>

              <div className="space-y-1">
                {template.sections.slice(0, 4).map((section) => (
                  <div
                    key={section.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    {section.isRequired ? (
                      <Check className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                    ) : (
                      <Circle className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate">{section.name}</span>
                    {section.suggestedDuration && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDuration(section.suggestedDuration)}
                      </span>
                    )}
                  </div>
                ))}
                {template.sections.length > 4 && (
                  <div className="text-xs text-muted-foreground pl-5">
                    +{template.sections.length - 4} mais seções
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Select Button */}
          <Button
            onClick={() => onSelect(template.id)}
            className="w-full"
            variant={isRecommended ? "default" : "outline"}
          >
            Usar este template
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
