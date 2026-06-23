"use client"

import { useCallback, useState } from "react"

import type { Project } from "@/types/project"

export type ProjectDialogType = "create" | "rename" | "delete"

export interface UseProjectDialogs {
  /** Which dialog is currently open, or null when all are closed. */
  openDialog: ProjectDialogType | null
  /** The project a rename/delete dialog is acting on. */
  activeProject: Project | null
  /** Shared name input value for the create/rename forms. */
  name: string
  /** True while a submit is in flight. */
  loading: boolean
  setName: (name: string) => void
  openCreate: () => void
  openRename: (project: Project) => void
  openDelete: (project: Project) => void
  close: () => void
  submitCreate: () => void
  submitRename: () => void
  submitDelete: () => void
}

/**
 * Owns all project dialog state for the editor: which dialog is open, the
 * shared form (name) value, the project being acted on, and loading state.
 *
 * No persistence yet — submit handlers simply close the active dialog. The
 * loading flag is threaded through so dialogs can disable controls once a real
 * API is added.
 */
export function useProjectDialogs(): UseProjectDialogs {
  const [openDialog, setOpenDialog] = useState<ProjectDialogType | null>(null)
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)

  const close = useCallback(() => {
    setOpenDialog(null)
    setActiveProject(null)
    setName("")
    setLoading(false)
  }, [])

  const openCreate = useCallback(() => {
    setActiveProject(null)
    setName("")
    setLoading(false)
    setOpenDialog("create")
  }, [])

  const openRename = useCallback((project: Project) => {
    setActiveProject(project)
    setName(project.name)
    setLoading(false)
    setOpenDialog("rename")
  }, [])

  const openDelete = useCallback((project: Project) => {
    setActiveProject(project)
    setName("")
    setLoading(false)
    setOpenDialog("delete")
  }, [])

  const submitCreate = useCallback(() => {
    // No persistence yet — accept the form and close.
    close()
  }, [close])

  const submitRename = useCallback(() => {
    close()
  }, [close])

  const submitDelete = useCallback(() => {
    close()
  }, [close])

  return {
    openDialog,
    activeProject,
    name,
    loading,
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
