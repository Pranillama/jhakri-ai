"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

/** Coalesces rapid graph changes (e.g. a node drag) into a single save. */
const SAVE_DEBOUNCE_MS = 1000

/** How long "saved"/"error" stay visible before the button reverts to "Save". */
const STATUS_RESET_MS = 2000

export type SaveStatus = "idle" | "saving" | "saved" | "error"

interface UseCanvasAutosaveParams {
  projectId: string
  /**
   * Not sent to the server — the route snapshots Liveblocks Storage directly,
   * since that's already the converged state for the room and this client's
   * local copy of it can lag. `nodes`/`edges` exist here purely as the
   * change-detection signal that schedules a debounced save.
   */
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  /**
   * Gates autosave until the initial load-or-skip decision has resolved, so a
   * save doesn't fire while the room is still empty and waiting on the fetch.
   */
  enabled: boolean
}

export interface UseCanvasAutosave {
  status: SaveStatus
  /** Saves the current graph immediately — used by both autosave and a manual Save click. */
  save: () => void
}

/**
 * Debounced autosave for the collaborative canvas: watches `nodes`/`edges`
 * and, once `enabled`, triggers a save to `/api/projects/[projectId]/canvas`
 * `SAVE_DEBOUNCE_MS` after the last change. Also exposes `save` directly so a
 * manual Save action can trigger the identical request on demand.
 */
export function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  enabled,
}: UseCanvasAutosaveParams): UseCanvasAutosave {
  const [status, setStatus] = useState<SaveStatus>("idle")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(async () => {
    // Never save before the initial load-or-skip decision has resolved: the
    // room may still hold the empty pre-load state, and saving would persist
    // that instead of a previously-saved canvas. The debounce path gates on
    // this too; guard here so a manual Save click can't bypass it.
    if (!enabled) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    if (resetRef.current) {
      clearTimeout(resetRef.current)
      resetRef.current = null
    }

    setStatus("saving")
    try {
      // No body: the route reads the current graph from Liveblocks Storage
      // itself rather than trusting this client's local copy of it.
      const response = await fetch(`/api/projects/${projectId}/canvas`, {
        method: "PUT",
      })

      if (!response.ok) throw new Error("Save failed")
      setStatus("saved")
    } catch {
      setStatus("error")
    } finally {
      resetRef.current = setTimeout(() => setStatus("idle"), STATUS_RESET_MS)
    }
  }, [projectId, enabled])

  useEffect(() => {
    if (!enabled) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(save, SAVE_DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [nodes, edges, enabled, save])

  useEffect(() => {
    return () => {
      if (resetRef.current) clearTimeout(resetRef.current)
    }
  }, [])

  return { status, save }
}
