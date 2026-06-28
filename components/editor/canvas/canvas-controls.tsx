"use client"

import { Maximize, Minus, Plus, Redo2, Undo2 } from "lucide-react"
import { useReactFlow } from "@xyflow/react"
import { useCanRedo, useCanUndo, useRedo, useUndo } from "@liveblocks/react"
import type { ReactNode } from "react"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

// Short animation so zoom/fit movement feels smooth rather than instant.
const ZOOM_DURATION = 200

interface ControlButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}

function ControlButton({ label, onClick, disabled, children }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full text-copy-muted transition-colors hover:bg-subtle hover:text-copy-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-copy-muted"
    >
      {children}
    </button>
  )
}

export function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow<CanvasNode, CanvasEdge>()
  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  return (
    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1 rounded-full border border-surface-border bg-elevated px-2 py-1.5 shadow-lg">
      <ControlButton label="Zoom out" onClick={() => zoomOut({ duration: ZOOM_DURATION })}>
        <Minus className="h-4 w-4" />
      </ControlButton>
      <ControlButton label="Fit view" onClick={() => fitView({ duration: ZOOM_DURATION })}>
        <Maximize className="h-4 w-4" />
      </ControlButton>
      <ControlButton label="Zoom in" onClick={() => zoomIn({ duration: ZOOM_DURATION })}>
        <Plus className="h-4 w-4" />
      </ControlButton>

      <div className="mx-1 h-5 w-px bg-surface-border" aria-hidden />

      <ControlButton label="Undo" onClick={undo} disabled={!canUndo}>
        <Undo2 className="h-4 w-4" />
      </ControlButton>
      <ControlButton label="Redo" onClick={redo} disabled={!canRedo}>
        <Redo2 className="h-4 w-4" />
      </ControlButton>
    </div>
  )
}
