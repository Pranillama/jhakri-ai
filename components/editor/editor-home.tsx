"use client"

import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

interface EditorHomeProps {
  onCreateProject: () => void
}

/**
 * Editor landing content shown when no project is open. Minimal, uncarded
 * prompt to create or pick a project.
 */
export function EditorHome({ onCreateProject }: EditorHomeProps) {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-copy-primary">
          Create a project or open an existing one
        </h1>
        <p className="max-w-md text-sm text-copy-muted">
          Start a new architecture workspace, or choose a project from the
          sidebar.
        </p>
      </div>

      <Button onClick={onCreateProject}>
        <Plus className="h-4 w-4" />
        New Project
      </Button>
    </div>
  )
}
