"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface NewProjectButtonProps {
  onClick: () => void
}

export function NewProjectButton({ onClick }: NewProjectButtonProps) {
  return (
    <Button onClick={onClick} size="lg" className="gap-2">
      <Plus className="h-5 w-5" />
      New Project
    </Button>
  )
}
