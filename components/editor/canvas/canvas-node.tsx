"use client"

import {
  Handle,
  NodeResizer,
  Position,
  useReactFlow,
  type NodeProps,
} from "@xyflow/react"
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react"

import { DEFAULT_NODE_COLOR, NODE_COLORS, type CanvasNode } from "@/types/canvas"
import { NodeColorToolbar } from "./node-color-toolbar"
import { ShapeVisual } from "./shape-visual"

function resolveColor(fill: string) {
  return NODE_COLORS.find((c) => c.fill === fill) ?? DEFAULT_NODE_COLOR
}

// Subtle four-side connection handles: small white dots with a dark border,
// hidden by default and faded in on node hover. They grow on direct hover so
// they are easy to grab and pull a connection from.
const HANDLE_CLASS =
  "!h-2.5 !w-2.5 !rounded-full !border !border-[color:var(--bg-base)] !bg-white opacity-0 transition-all group-hover:opacity-100 hover:!h-4 hover:!w-4"

/** Smallest size a node can be resized to. */
const MIN_WIDTH = 80
const MIN_HEIGHT = 60

const LABEL_PLACEHOLDER = "Add label"

export function CanvasNodeRenderer({
  id,
  data,
  selected,
}: NodeProps<CanvasNode>) {
  const color = resolveColor(data.color)
  // Keep the shape border subtle at all times — selection is indicated by the
  // resize frame, not by recoloring the shape outline.
  const stroke = "var(--border-subtle)"

  const { updateNodeData } = useReactFlow<CanvasNode>()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data.label)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus and select the textarea contents when entering edit mode.
  useEffect(() => {
    if (!editing) return
    const el = textareaRef.current
    el?.focus()
    el?.select()
  }, [editing])

  function startEditing(e: MouseEvent) {
    // Stop the double-click from reaching the pane (default zoom-on-dblclick).
    e.stopPropagation()
    setDraft(data.label)
    setEditing(true)
  }

  function onChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value
    setDraft(next)
    // Push every keystroke through the controlled onNodesChange → Liveblocks
    // sync flow so collaborators see the label update live.
    updateNodeData(id, { label: next })
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      e.preventDefault()
      setEditing(false)
    }
  }

  return (
    <div className="group relative h-full w-full">
      {/* Resize handles, shown only while the node is selected. Tinted with the
          brand accent to stay consistent with the selected-node border. */}
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_WIDTH}
        minHeight={MIN_HEIGHT}
        color="var(--accent-primary)"
        handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
      />

      {/* Floating color toolbar above the selected node. Selecting a swatch
          updates only `data.color` (the fill); the paired text color is derived
          by `resolveColor`, so background and text change together. The update
          routes through `updateNodeData` → the controlled `onNodesChange` →
          Liveblocks, the same in-session sync used for labels (no server call). */}
      <NodeColorToolbar
        selected={selected}
        activeFill={data.color}
        onSelect={(fill) => updateNodeData(id, { color: fill })}
      />

      {/* One handle per side, each with a unique id so a connection records the
          exact side it used and the edge routes to/from that side. With
          ConnectionMode.Loose every handle can act as both source and target,
          so any side can connect to any other side. */}
      <Handle id="top" type="target" position={Position.Top} className={HANDLE_CLASS} />
      <Handle id="left" type="target" position={Position.Left} className={HANDLE_CLASS} />

      <ShapeVisual shape={data.shape} fill={color.fill} stroke={stroke} />

      {/* Centered label / editor overlay. Double-click anywhere here opens
          inline editing. The textarea sits directly over the label so toggling
          edit mode causes no layout shift. */}
      <div
        className="absolute inset-0 flex items-center justify-center px-4"
        onDoubleClick={startEditing}
      >
        {editing ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={onChange}
            onBlur={() => setEditing(false)}
            onKeyDown={onKeyDown}
            // nodrag/nopan/nowheel keep text selection from dragging or panning
            // the canvas; stopPropagation guards the same on mouse down.
            onMouseDown={(e) => e.stopPropagation()}
            placeholder={LABEL_PLACEHOLDER}
            rows={1}
            className="nodrag nopan nowheel w-full resize-none overflow-hidden border-0 bg-transparent text-center text-sm leading-tight outline-none placeholder:text-copy-muted"
            style={{ color: color.text }}
          />
        ) : data.label ? (
          <span
            className="select-none text-center text-sm leading-tight"
            style={{ color: color.text }}
          >
            {data.label}
          </span>
        ) : (
          <span className="select-none text-center text-sm leading-tight text-copy-muted">
            {LABEL_PLACEHOLDER}
          </span>
        )}
      </div>

      <Handle id="bottom" type="source" position={Position.Bottom} className={HANDLE_CLASS} />
      <Handle id="right" type="source" position={Position.Right} className={HANDLE_CLASS} />
    </div>
  )
}
