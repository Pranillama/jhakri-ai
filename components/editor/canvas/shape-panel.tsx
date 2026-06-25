"use client"

import {
  Circle,
  Database,
  Diamond,
  Hexagon,
  Pill,
  Square,
} from "lucide-react"
import type { DragEvent } from "react"

import type { NodeShape } from "@/types/canvas"

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

function onDragStart(e: DragEvent, config: ShapeConfig) {
  const payload: ShapeDragPayload = {
    shape: config.shape,
    width: config.width,
    height: config.height,
  }
  e.dataTransfer.setData("application/ghost-shape", JSON.stringify(payload))
  e.dataTransfer.effectAllowed = "move"
}

export function ShapePanel() {
  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-surface-border bg-elevated px-3 py-2 shadow-lg">
      {SHAPES.map(({ shape, icon: Icon, width, height }) => (
        <button
          key={shape}
          type="button"
          draggable
          onDragStart={(e) => onDragStart(e, { shape, icon: Icon, width, height })}
          className="flex h-9 w-9 cursor-grab items-center justify-center rounded-full text-copy-muted transition-colors hover:bg-subtle hover:text-copy-primary active:cursor-grabbing"
          title={shape}
          aria-label={shape}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}
