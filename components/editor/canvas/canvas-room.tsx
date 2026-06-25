"use client"

import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense"
import { ReactFlowProvider } from "@xyflow/react"

import { Canvas } from "./canvas"
import { CanvasErrorBoundary } from "./canvas-error-boundary"

interface CanvasRoomProps {
  /** Liveblocks room ID — equal to the project ID. */
  roomId: string
}

/**
 * Connects the canvas to its Liveblocks room. Authenticates through
 * `/api/liveblocks-auth`, joins the room for this project, and renders the
 * React Flow canvas once Storage is ready — with a loading state while
 * connecting and an error fallback if the connection fails.
 */
export function CanvasRoom({ roomId }: CanvasRoomProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, isThinking: false }}
      >
        <div className="relative flex-1 bg-base">
          <CanvasErrorBoundary>
            <ClientSideSuspense fallback={<CanvasLoading />}>
              <ReactFlowProvider>
                <Canvas />
              </ReactFlowProvider>
            </ClientSideSuspense>
          </CanvasErrorBoundary>
        </div>
      </RoomProvider>
    </LiveblocksProvider>
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
