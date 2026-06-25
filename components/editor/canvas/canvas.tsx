"use client"

import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type NodeTypes,
} from "@xyflow/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import "@xyflow/react/dist/style.css"

import { useCallback, useMemo, useRef, type DragEvent } from "react"

import { DEFAULT_NODE_COLOR, type CanvasNode, type CanvasEdge } from "@/types/canvas"
import { CanvasNodeRenderer } from "./canvas-node"
import { ShapePanel, type ShapeDragPayload } from "./shape-panel"

export function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })

  const { screenToFlowPosition, addNodes } = useReactFlow<CanvasNode, CanvasEdge>()
  const wrapperRef = useRef<HTMLDivElement>(null)

  const nodeTypes: NodeTypes = useMemo(
    () => ({ canvasNode: CanvasNodeRenderer }),
    [],
  )

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()

      const raw = e.dataTransfer.getData("application/ghost-shape")
      if (!raw) return

      const payload: ShapeDragPayload = JSON.parse(raw)

      const position = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      })

      const id = `${payload.shape}-${crypto.randomUUID()}`

      const newNode: CanvasNode = {
        id,
        type: "canvasNode",
        position,
        data: {
          label: "",
          color: DEFAULT_NODE_COLOR.fill,
          shape: payload.shape,
        },
        style: { width: payload.width, height: payload.height },
      }

      addNodes([newNode])
    },
    [screenToFlowPosition, addNodes],
  )

  return (
    <div
      ref={wrapperRef}
      className="h-full w-full"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        colorMode="dark"
        fitView
      >
        <Background variant={BackgroundVariant.Dots} />
        <MiniMap />
        <ShapePanel />
      </ReactFlow>
    </div>
  )
}
