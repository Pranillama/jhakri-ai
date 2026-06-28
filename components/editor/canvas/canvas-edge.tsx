"use client"

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react"
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

/**
 * Default edge stroke — a light, near-white line (documented in
 * `context/ui-context.md`). Kept thin so edges stay visually secondary to nodes.
 */
export const EDGE_STROKE = "#f8fafc"
const EDGE_STROKE_WIDTH = 1.5
/** Wide invisible hit area so edges are easy to hover/click without thickening
 *  the visible line. */
const EDGE_INTERACTION_WIDTH = 24

const LABEL_HINT = "Double-click to label"

export function CanvasEdgeRenderer({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  markerEnd,
  selected,
  data,
}: EdgeProps<CanvasEdge>) {
  // Clean right-angle routing. We take the midpoint coordinates straight from
  // getSmoothStepPath rather than computing them by hand so the label always
  // tracks the rendered path.
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const { updateEdgeData } = useReactFlow<CanvasNode, CanvasEdge>()

  const label = data?.label ?? ""
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(label)
  const inputRef = useRef<HTMLInputElement>(null)
  const committedRef = useRef(false)

  // Edges sit dimmed at rest and brighten on hover or selection.
  const active = hovered || Boolean(selected) || editing

  useEffect(() => {
    if (!editing) return
    const el = inputRef.current
    el?.focus()
    el?.select()
  }, [editing])

  function startEditing(e: MouseEvent) {
    e.stopPropagation()
    setDraft(label)
    committedRef.current = false
    setEditing(true)
  }

  function commit() {
    if (committedRef.current) return
    committedRef.current = true
    setEditing(false)
    updateEdgeData(id, { label: draft.trim() })
  }

  function cancel() {
    committedRef.current = true
    setEditing(false)
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    setDraft(e.target.value)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      commit()
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancel()
    }
  }

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={startEditing}
    >
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={EDGE_INTERACTION_WIDTH}
        style={{
          stroke: EDGE_STROKE,
          strokeWidth: EDGE_STROKE_WIDTH,
          strokeLinecap: "round",
          opacity: active ? 1 : 0.5,
          transition: "opacity 120ms ease",
        }}
      />

      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          // Keep label interaction from dragging or panning the canvas.
          onMouseDown={(e) => e.stopPropagation()}
          onDoubleClick={startEditing}
        >
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={onChange}
              onBlur={commit}
              onKeyDown={onKeyDown}
              placeholder="Label"
              // Grow the input with its text (min keeps the placeholder visible).
              style={{ width: `${Math.max(draft.length, 5) + 1}ch` }}
              className="rounded-full border border-surface-border bg-elevated px-2 py-0.5 text-center text-xs text-copy-primary outline-none focus:border-brand"
            />
          ) : label ? (
            <span className="select-none rounded-full border border-surface-border bg-elevated px-2 py-0.5 text-xs text-copy-secondary">
              {label}
            </span>
          ) : active ? (
            <span className="pointer-events-none select-none whitespace-nowrap text-[10px] text-copy-faint">
              {LABEL_HINT}
            </span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </g>
  )
}
