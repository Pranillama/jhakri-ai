"use client"

import { EditorDialog } from "@/components/editor/editor-dialog"
import { Button } from "@/components/ui/button"
import { StarterTemplatePreview } from "./starter-template-preview"
import { CANVAS_TEMPLATES, type CanvasTemplate } from "./starter-templates"

interface StarterTemplatesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the chosen template just before the modal closes. */
  onImport: (template: CanvasTemplate) => void
}

/**
 * Dialog listing the prebuilt starter templates as a scrollable grid of cards,
 * each with a diagram preview, name, description, and an import action.
 * Importing hands the template to `onImport` and closes the modal; the caller
 * is responsible for loading it into the canvas.
 */
export function StarterTemplatesModal({
  open,
  onOpenChange,
  onImport,
}: StarterTemplatesModalProps) {
  function handleImport(template: CanvasTemplate) {
    onImport(template)
    onOpenChange(false)
  }

  return (
    <EditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Start from a template"
      description="Import a prebuilt system design. This replaces the current canvas."
      className="sm:max-w-3xl"
    >
      <div className="max-h-[60vh] overflow-y-auto pr-1">
        <div className="grid gap-4 sm:grid-cols-2">
          {CANVAS_TEMPLATES.map((template) => (
            <article
              key={template.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-surface-border bg-elevated"
            >
              <div className="h-36 border-b border-surface-border bg-base p-2">
                <StarterTemplatePreview template={template} />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="text-sm font-medium text-copy-primary">
                  {template.name}
                </h3>
                <p className="flex-1 text-xs leading-relaxed text-copy-muted">
                  {template.description}
                </p>
                <Button
                  size="sm"
                  className="mt-1 w-full"
                  aria-label={`Import ${template.name} template`}
                  onClick={() => handleImport(template)}
                >
                  Import
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </EditorDialog>
  )
}
