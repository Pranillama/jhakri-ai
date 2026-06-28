"use client"

import {
  Circle,
  Database,
  Diamond,
  Hexagon,
  Pill,
  Square,
} from "lucide-react"
import { useRef, type DragEvent } from "react"

import { DEFAULT_NODE_COLOR, type NodeShape } from "@/types/canvas"
import { ShapeVisual } from "./shape-visual"

interface ShapeConfig {
  shape: NodeShape
  icon: typeof Square
  width: number
  height: number
}

const SHAPES: ShapeConfig[] = [
  { shape: "rectangle", icon: Square, width: 200, height: 100 },
  { shape: "diamond", icon: Diamond, width: 180, height: 180 },
  { shape: "circle", icon: Circle, width: 120, height: 120 },
  { shape: "pill", icon: Pill, width: 200, height: 80 },
  { shape: "cylinder", icon: Database, width: 140, height: 120 },
  { shape: "hexagon", icon: Hexagon, width: 160, height: 140 },
]

export interface ShapeDragPayload {
  shape: NodeShape
  width: number
  height: number
}

export function ShapePanel() {
  // Offscreen ghost elements, one per shape, used as the native drag image so
  // the cursor carries a preview of the exact shape and default size that will
  // be dropped. The browser hides the drag image automatically on drop/cancel.
  const ghostRefs = useRef<Record<string, HTMLDivElement | null>>({})

  function onDragStart(e: DragEvent, config: ShapeConfig) {
    const payload: ShapeDragPayload = {
      shape: config.shape,
      width: config.width,
      height: config.height,
    }
    e.dataTransfer.setData("application/ghost-shape", JSON.stringify(payload))
    e.dataTransfer.effectAllowed = "move"

    const ghost = ghostRefs.current[config.shape]
    if (ghost) {
      // Center the preview on the cursor.
      e.dataTransfer.setDragImage(ghost, config.width / 2, config.height / 2)
    }
  }

  return (
    <>
      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-surface-border bg-elevated px-3 py-2 shadow-lg">
        {SHAPES.map((config) => {
          const { shape, icon: Icon } = config
          return (
            <button
              key={shape}
              type="button"
              draggable
              onDragStart={(e) => onDragStart(e, config)}
              className="flex h-9 w-9 cursor-grab items-center justify-center rounded-full text-copy-muted transition-colors hover:bg-subtle hover:text-copy-primary active:cursor-grabbing"
              title={shape}
              aria-label={shape}
            >
              <Icon className="h-4 w-4" />
            </button>
          )
        })}
      </div>

      {/* Rendered offscreen purely to source the drag-image bitmap. */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-[-9999px] top-0 opacity-80"
      >
        {SHAPES.map(({ shape, width, height }) => (
          <div
            key={shape}
            ref={(el) => {
              ghostRefs.current[shape] = el
            }}
            className="relative"
            style={{ width, height }}
          >
            <ShapeVisual
              shape={shape}
              fill={DEFAULT_NODE_COLOR.fill}
              stroke="var(--border-subtle)"
            />
          </div>
        ))}
      </div>
    </>
  )
}
