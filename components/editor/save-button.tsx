"use client"

import { Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { SaveStatus } from "@/hooks/use-canvas-autosave"

interface SaveButtonProps {
  status: SaveStatus
  onSave: () => void
}

const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: "Save",
  saving: "Saving...",
  saved: "Saved",
  error: "Error",
}

/**
 * Manual save trigger for the workspace navbar. Reflects the same
 * `SaveStatus` the autosave hook tracks; clicking calls the identical `save`
 * function autosave uses, so a manual save and a debounced save behave the
 * same way. "saved"/"error" are transient — the hook reverts to "idle" (shown
 * as "Save") a couple seconds after either.
 */
export function SaveButton({ status, onSave }: SaveButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onSave}
      disabled={status === "saving"}
      aria-label="Save project"
      className={status === "error" ? "text-error" : undefined}
    >
      {status === "saving" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {STATUS_LABEL[status]}
    </Button>
  )
}
