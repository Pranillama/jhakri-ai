"use client"

import { ClientSideSuspense } from "@liveblocks/react/suspense"
import { ReactFlowProvider } from "@xyflow/react"

import type { SaveStatus } from "@/hooks/use-canvas-autosave"

import { Canvas } from "./canvas"
import { CanvasErrorBoundary } from "./canvas-error-boundary"

interface CanvasRoomProps {
  /** Liveblocks room ID — equal to the project ID. */
  roomId: string
  /** Whether the starter templates modal is open. */
  templatesOpen: boolean
  /** Toggles the starter templates modal. */
  onTemplatesOpenChange: (open: boolean) => void
  /** Reports autosave status up to the navbar's save button. */
  onSaveStatusChange: (status: SaveStatus) => void
  /** Registers the manual-save function so the navbar's Save button can call it. */
  onRegisterSave: (save: () => void) => void
}

/**
 * Renders the React Flow canvas for the room the shell has already joined —
 * with a loading state while the realtime connection settles and an error
 * fallback if it fails, so a connection problem is isolated to the canvas
 * instead of taking down the workspace around it.
 *
 * The room itself is entered one level up (`EditorRoomShell`), because the AI
 * sidebar is a sibling of this component and shares the same room.
 */
export function CanvasRoom({
  roomId,
  templatesOpen,
  onTemplatesOpenChange,
  onSaveStatusChange,
  onRegisterSave,
}: CanvasRoomProps) {
  return (
    <div className="relative flex-1 bg-base">
      <CanvasErrorBoundary>
        <ClientSideSuspense fallback={<CanvasLoading />}>
          <ReactFlowProvider>
            <Canvas
              projectId={roomId}
              templatesOpen={templatesOpen}
              onTemplatesOpenChange={onTemplatesOpenChange}
              onSaveStatusChange={onSaveStatusChange}
              onRegisterSave={onRegisterSave}
            />
          </ReactFlowProvider>
        </ClientSideSuspense>
      </CanvasErrorBoundary>
    </div>
  )
}

/** Simple loading state shown while the Liveblocks room connects. */
function CanvasLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-base px-6 text-center">
      <p className="text-sm text-copy-muted">Connecting to the canvas…</p>
    </div>
  )
}
