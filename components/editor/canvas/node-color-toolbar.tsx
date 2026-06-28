"use client"

import { NodeToolbar, Position } from "@xyflow/react"
import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"
import { NODE_COLORS } from "@/types/canvas"

interface NodeColorToolbarProps {
  /** Render the toolbar only while the node is selected. */
  selected: boolean
  /** The node's current fill — marks the active swatch. */
  activeFill: string
  /** Apply a color pair by its fill. The paired text color is derived from it. */
  onSelect: (fill: string) => void
}

/**
 * Floating color toolbar shown above a selected node. Renders one swatch per
 * `NODE_COLORS` pair; selecting a swatch updates the node's background and
 * (derived) text color. Built on React Flow's `NodeToolbar` so it floats
 * slightly above the node at a constant on-screen size and never overlaps it.
 *
 * The swatch background is the pair's node fill and the inner dot is its text
 * color, so each swatch previews the whole pair. The active swatch carries an
 * outline ring and hovering any swatch adds a tight glow — both keyed off the
 * pair's text color via the `--glow` custom property (outline and box-shadow are
 * independent properties, so the ring and the glow compose without clobbering
 * each other).
 */
export function NodeColorToolbar({
  selected,
  activeFill,
  onSelect,
}: NodeColorToolbarProps) {
  return (
    <NodeToolbar
      isVisible={selected}
      position={Position.Top}
      offset={12}
      // nodrag/nopan keep swatch interactions from dragging the node or panning
      // the canvas; stopPropagation guards the same before the pane handlers.
      className="nodrag nopan flex items-center gap-1.5 rounded-full border border-surface-border bg-elevated px-2 py-1.5 shadow-lg"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {NODE_COLORS.map((color) => {
        const isActive = color.fill === activeFill
        return (
          <button
            key={color.fill}
            type="button"
            aria-label={`Set node color ${color.text}`}
            aria-pressed={isActive}
            onClick={() => onSelect(color.fill)}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border border-surface-border transition-shadow",
              "hover:shadow-[0_0_6px_var(--glow)]",
              isActive && "outline outline-2 outline-offset-2",
            )}
            style={
              {
                "--glow": color.text,
                backgroundColor: color.fill,
                outlineColor: isActive ? color.text : undefined,
              } as CSSProperties
            }
          >
            {/* Inner dot previews the paired text color. */}
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color.text }}
            />
          </button>
        )
      })}
    </NodeToolbar>
  )
}
