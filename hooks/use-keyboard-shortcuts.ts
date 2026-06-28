"use client"

import { useEffect, type RefObject } from "react"
import type { ReactFlowInstance } from "@xyflow/react"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

// Matches the control bar's zoom animation so keyboard and button zoom feel the same.
const ZOOM_DURATION = 200

interface UseKeyboardShortcutsParams {
  reactFlow: ReactFlowInstance<CanvasNode, CanvasEdge>
  wrapperRef: RefObject<HTMLDivElement | null>
  onUndo: () => void
  onRedo: () => void
}

// Skip shortcuts while the user is typing so editing a node/edge label or any
// other field isn't hijacked by canvas keybindings.
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable
}

export function useKeyboardShortcuts({
  reactFlow,
  wrapperRef,
  onUndo,
  onRedo,
}: UseKeyboardShortcutsParams) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return

      if (
        wrapperRef.current &&
        event.target !== document.body &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        return
      }

      // Cmd/Ctrl combos: history.
      if (event.metaKey || event.ctrlKey) {
        const key = event.key.toLowerCase()
        if (key === "z") {
          event.preventDefault()
          if (event.shiftKey) {
            onRedo()
          } else {
            onUndo()
          }
          return
        }
        if (key === "y") {
          event.preventDefault()
          onRedo()
        }
        return
      }

      // Bare keys: zoom.
      switch (event.key) {
        case "+":
        case "=":
          event.preventDefault()
          reactFlow.zoomIn({ duration: ZOOM_DURATION })
          break
        case "-":
          event.preventDefault()
          reactFlow.zoomOut({ duration: ZOOM_DURATION })
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [reactFlow, wrapperRef, onUndo, onRedo])
}
