"use client"

import type { KeyboardEvent } from "react"

import { EditorDialog } from "@/components/editor/editor-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { slugify } from "@/lib/slug"
import type { UseProjectDialogs } from "@/hooks/use-project-dialogs"

interface ProjectDialogsProps {
  dialogs: UseProjectDialogs
}

/**
 * Renders the Create / Rename / Delete project dialogs, driven entirely by the
 * shared `useProjectDialogs` hook. Only the active dialog mounts at a time.
 */
export function ProjectDialogs({ dialogs }: ProjectDialogsProps) {
  return (
    <>
      <CreateProjectDialog dialogs={dialogs} />
      <RenameProjectDialog dialogs={dialogs} />
      <DeleteProjectDialog dialogs={dialogs} />
    </>
  )
}

function CreateProjectDialog({ dialogs }: ProjectDialogsProps) {
  const { openDialog, name, loading, setName, close, submitCreate } = dialogs
  const slug = slugify(name)
  // A name made only of symbols/whitespace yields an empty slug — block it.
  const canSubmit = !loading && slug !== ""
  const showSlugWarning = name.trim() !== "" && slug === ""

  return (
    <EditorDialog
      open={openDialog === "create"}
      onOpenChange={(open) => (open ? undefined : close())}
      title="New Project"
      description="Name your architecture workspace. You can rename it later."
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submitCreate} disabled={!canSubmit}>
            Create Project
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <label
          htmlFor="create-project-name"
          className="text-sm font-medium text-copy-secondary"
        >
          Project Name
        </label>
        <Input
          id="create-project-name"
          value={name}
          autoFocus
          placeholder="e.g. Realtime Chat Platform"
          className="text-copy-primary"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={onEnterSubmit(submitCreate, !canSubmit)}
        />
        {showSlugWarning ? (
          <p className="text-xs text-error">
            Name must include at least one letter or number.
          </p>
        ) : (
          <p className="text-xs text-copy-muted">
            Slug:{" "}
            <span className="font-mono text-copy-secondary">
              {slug || "your-project"}
            </span>
          </p>
        )}
      </div>
    </EditorDialog>
  )
}

function RenameProjectDialog({ dialogs }: ProjectDialogsProps) {
  const { openDialog, activeProject, name, loading, setName, close, submitRename } =
    dialogs
  // Same empty-slug guard as Create — a rename must still yield a usable slug.
  const canSubmit = !loading && slugify(name) !== ""
  const showSlugWarning = name.trim() !== "" && slugify(name) === ""

  return (
    <EditorDialog
      open={openDialog === "rename"}
      onOpenChange={(open) => (open ? undefined : close())}
      title="Rename project"
      description={
        activeProject
          ? `Currently named "${activeProject.name}".`
          : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submitRename} disabled={!canSubmit}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <label
          htmlFor="rename-project-name"
          className="text-sm font-medium text-copy-secondary"
        >
          Project name
        </label>
        <Input
          id="rename-project-name"
          value={name}
          autoFocus
          className="text-copy-primary"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={onEnterSubmit(submitRename, !canSubmit)}
        />
        {showSlugWarning ? (
          <p className="text-xs text-error">
            Name must include at least one letter or number.
          </p>
        ) : null}
      </div>
    </EditorDialog>
  )
}

function DeleteProjectDialog({ dialogs }: ProjectDialogsProps) {
  const { openDialog, activeProject, loading, close, submitDelete } = dialogs

  return (
    <EditorDialog
      open={openDialog === "delete"}
      onOpenChange={(open) => (open ? undefined : close())}
      title="Delete project"
      description={
        activeProject
          ? `"${activeProject.name}" will be permanently deleted. This action cannot be undone.`
          : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submitDelete} disabled={loading}>
            Delete project
          </Button>
        </>
      }
    />
  )
}

/**
 * Submit the active form when Enter is pressed, unless the action is disabled.
 */
function onEnterSubmit(submit: () => void, disabled: boolean) {
  return (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return
    event.preventDefault()
    if (disabled) return
    submit()
  }
}
