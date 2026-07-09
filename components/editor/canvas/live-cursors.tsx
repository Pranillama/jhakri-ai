"use client"

import { ViewportPortal } from "@xyflow/react"
import {
  shallow,
  useOther,
  useOthersConnectionIds,
} from "@liveblocks/react/suspense"

/**
 * Renders every other participant's cursor at their current flow-coordinate
 * presence position. `useOthersConnectionIds` only re-renders the list when
 * users join or leave; each `Cursor` re-renders only when its own presence
 * changes. Rendering inside React Flow's `ViewportPortal` places the cursor
 * inside the canvas transform so it pans and zooms with the graph.
 */
export function LiveCursors() {
  const connectionIds = useOthersConnectionIds()

  return (
    <ViewportPortal>
      {connectionIds.map((connectionId) => (
        <Cursor key={connectionId} connectionId={connectionId} />
      ))}
    </ViewportPortal>
  )
}

interface CursorProps {
  connectionId: number
}

function Cursor({ connectionId }: CursorProps) {
  const cursor = useOther(
    connectionId,
    (other) => other.presence.cursor,
    shallow,
  )
  const info = useOther(
    connectionId,
    (other) => ({
      name: other.info?.name ?? "Anonymous",
      color: other.info?.color ?? "#808080",
    }),
    shallow,
  )

  if (!cursor) return null

  return (
    <div
      className="pointer-events-none absolute top-0 left-0 flex items-start"
      style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        style={{ color: info.color }}
        className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]"
      >
        <path
          d="M2 2 L2 16 L6 12 L9 18 L11 17 L8 11 L14 11 Z"
          fill="currentColor"
          stroke="white"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="ml-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-white shadow-sm"
        style={{ backgroundColor: info.color }}
      >
        {info.name}
      </span>
    </div>
  )
}
