"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"

import { DEFAULT_NODE_COLOR, NODE_COLORS, type CanvasNode } from "@/types/canvas"

function resolveColor(fill: string) {
  return NODE_COLORS.find((c) => c.fill === fill) ?? DEFAULT_NODE_COLOR
}

export function CanvasNodeRenderer({ data }: NodeProps<CanvasNode>) {
  const color = resolveColor(data.color)

  return (
    <div
      className="group flex items-center justify-center rounded-xl border border-surface-border-subtle px-4 py-3 text-sm"
      style={{ backgroundColor: color.fill, color: color.text }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !rounded-full !border-0 !bg-white opacity-0 group-hover:opacity-100"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !rounded-full !border-0 !bg-white opacity-0 group-hover:opacity-100"
      />

      <span className="select-none text-center leading-tight">
        {data.label || data.shape}
      </span>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !rounded-full !border-0 !bg-white opacity-0 group-hover:opacity-100"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !rounded-full !border-0 !bg-white opacity-0 group-hover:opacity-100"
      />
    </div>
  )
}
