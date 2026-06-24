"use client"

import { usePathname, useRouter } from "next/navigation"
import { useCallback, useState } from "react"

import { slugify } from "@/lib/slug"
import type { Project } from "@/types/project"

export type ProjectDialogType = "create" | "rename" | "delete"

export interface UseProjectDialogs {
  /** Which dialog is currently open, or null when all are closed. */
  openDialog: ProjectDialogType | null
  /** The project a rename/delete dialog is acting on. */
  activeProject: Project | null
  /** Shared name input value for the create/rename forms. */
  name: string
  /**
   * Live room-ID preview for the create form (`<slug>-<suffix>`). Empty when the
   * current name has no usable slug. This is the exact ID submitted on create,
   * so the project ID and Liveblocks room ID stay aligned.
   */
  roomId: string
  /** True while a submit is in flight. */
  loading: boolean
  /** Message from the last failed mutation, cleared when a dialog (re)opens. */
  error: string | null
  setName: (name: string) => void
  openCreate: () => void
  openRename: (project: Project) => void
  openDelete: (project: Project) => void
  close: () => void
  submitCreate: () => void
  submitRename: () => void
  submitDelete: () => void
}

/** Short lowercase-alphanumeric suffix that keeps generated room IDs unique. */
function generateSuffix(): string {
  return Math.random().toString(36).slice(2, 8)
}

/**
 * Owns all project dialog state for the editor and drives the project API:
 * which dialog is open, the shared name input, the room-ID suffix, and the
 * project being acted on. Create posts to `/api/projects` and navigates to the
 * new workspace; rename and delete call the per-project route and then refresh
 * (or, when deleting the open workspace, redirect to `/editor`).
 */
export function useProjectDialogs(): UseProjectDialogs {
  const router = useRouter()
  const pathname = usePathname()

  const [openDialog, setOpenDialog] = useState<ProjectDialogType | null>(null)
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [name, setName] = useState("")
  const [suffix, setSuffix] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const slug = slugify(name)
  const roomId = slug ? `${slug}-${suffix}` : ""

  const close = useCallback(() => {
    setOpenDialog(null)
    setActiveProject(null)
    setName("")
    setSuffix("")
    setLoading(false)
    setError(null)
  }, [])

  const openCreate = useCallback(() => {
    setActiveProject(null)
    setName("")
    // Fix the suffix when the dialog opens so the preview matches what we submit.
    setSuffix(generateSuffix())
    setLoading(false)
    setError(null)
    setOpenDialog("create")
  }, [])

  const openRename = useCallback((project: Project) => {
    setActiveProject(project)
    setName(project.name)
    setSuffix("")
    setLoading(false)
    setError(null)
    setOpenDialog("rename")
  }, [])

  const openDelete = useCallback((project: Project) => {
    setActiveProject(project)
    setName("")
    setSuffix("")
    setLoading(false)
    setError(null)
    setOpenDialog("delete")
  }, [])

  const submitCreate = useCallback(async () => {
    const trimmedName = name.trim()
    const projectSlug = slugify(trimmedName)
    // The room ID — and thus the project ID — must derive from a usable slug.
    if (!projectSlug) return

    const newRoomId = `${projectSlug}-${suffix}`
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send the room ID as the project ID so the two stay aligned.
        body: JSON.stringify({ id: newRoomId, name: trimmedName }),
      })

      if (!response.ok) {
        throw new Error("Request failed")
      }

      const project = (await response.json()) as Project
      // Navigate to the new workspace; the page unmounts, so no close() needed.
      router.push(`/editor/${project.id}`)
    } catch {
      setError("Something went wrong creating the project. Please try again.")
      setLoading(false)
    }
  }, [name, suffix, router])

  const submitRename = useCallback(async () => {
    if (!activeProject) return
    const trimmedName = name.trim()
    if (!slugify(trimmedName)) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${activeProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      })

      if (!response.ok) {
        throw new Error("Request failed")
      }

      close()
      router.refresh()
    } catch {
      setError("Something went wrong renaming the project. Please try again.")
      setLoading(false)
    }
  }, [activeProject, name, close, router])

  const submitDelete = useCallback(async () => {
    if (!activeProject) return

    const targetId = activeProject.id
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${targetId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Request failed")
      }

      close()
      // Deleting the open workspace leaves a dead route — send the user home.
      if (pathname === `/editor/${targetId}`) {
        router.push("/editor")
      } else {
        router.refresh()
      }
    } catch {
      setError("Something went wrong deleting the project. Please try again.")
      setLoading(false)
    }
  }, [activeProject, pathname, close, router])

  return {
    openDialog,
    activeProject,
    name,
    roomId,
    loading,
    error,
    setName,
    openCreate,
    openRename,
    openDelete,
    close,
    submitCreate,
    submitRename,
    submitDelete,
  }
}
