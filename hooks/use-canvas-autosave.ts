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
 * and, once `enabled`, saves the graph to `/api/projects/[projectId]/canvas`
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

  // Read via a ref so `save` always sends the latest graph, whether it fires
  // from the debounce timer or a manual click, without needing to change
  // identity every time the graph changes. Updated in an effect (not during
  // render) since refs must not be written while rendering.
  const graphRef = useRef({ nodes, edges })
  useEffect(() => {
    graphRef.current = { nodes, edges }
  }, [nodes, edges])

  const save = useCallback(async () => {
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
      const response = await fetch(`/api/projects/${projectId}/canvas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(graphRef.current),
      })

      if (!response.ok) throw new Error("Save failed")
      setStatus("saved")
    } catch {
      setStatus("error")
    } finally {
      resetRef.current = setTimeout(() => setStatus("idle"), STATUS_RESET_MS)
    }
  }, [projectId])

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
