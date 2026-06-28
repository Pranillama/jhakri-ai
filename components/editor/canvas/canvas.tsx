"use client"

import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  MarkerType,
  MiniMap,
  ReactFlow,
  reconnectEdge,
  useReactFlow,
  type DefaultEdgeOptions,
  type EdgeTypes,
  type NodeTypes,
  type OnReconnect,
} from "@xyflow/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import { useHistory, useRedo, useUndo } from "@liveblocks/react"
import "@xyflow/react/dist/style.css"

import { useCallback, useMemo, useRef, type DragEvent } from "react"

import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { DEFAULT_NODE_COLOR, type CanvasNode, type CanvasEdge } from "@/types/canvas"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { CanvasNodeRenderer } from "./canvas-node"
import { CanvasControls } from "./canvas-controls"
import { CanvasEdgeRenderer, EDGE_STROKE } from "./canvas-edge"
import { ShapePanel, type ShapeDragPayload } from "./shape-panel"

// New connections (including those created through Liveblocks' onConnect) inherit
// these defaults: the custom canvas edge renderer plus a matching arrowhead.
const DEFAULT_EDGE_OPTIONS: DefaultEdgeOptions = {
  type: "canvasEdge",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: EDGE_STROKE,
    width: 18,
    height: 18,
  },
}

interface CanvasProps {
  /** Whether the starter templates modal is open. */
  templatesOpen: boolean
  /** Toggles the starter templates modal. */
  onTemplatesOpenChange: (open: boolean) => void
}

export function Canvas({ templatesOpen, onTemplatesOpenChange }: CanvasProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })

  const reactFlow = useReactFlow<CanvasNode, CanvasEdge>()
  const wrapperRef = useRef<HTMLDivElement>(null)

  const undo = useUndo()
  const redo = useRedo()
  const history = useHistory()

  useKeyboardShortcuts({ reactFlow, wrapperRef, onUndo: undo, onRedo: redo })

  const handleImportTemplate = useCallback(
    (template: CanvasTemplate) => {
      // Pause history so setNodes + setEdges create a single undo entry.
      history.pause()
      reactFlow.setNodes(structuredClone(template.nodes))
      reactFlow.setEdges(structuredClone(template.edges))
      history.resume()
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          reactFlow.fitView({ duration: 400, padding: 0.2 })
        })
      })
    },
    [reactFlow, history],
  )

  const nodeTypes: NodeTypes = useMemo(
    () => ({ canvasNode: CanvasNodeRenderer }),
    [],
  )

  const edgeTypes: EdgeTypes = useMemo(
    () => ({ canvasEdge: CanvasEdgeRenderer }),
    [],
  )

  // Let a connected edge be re-pointed: dragging either endpoint onto a new
  // node/handle rewrites the edge's source/target. setEdges diffs against the
  // current graph and emits the change through the controlled onEdgesChange →
  // Liveblocks, so the move syncs through the same collaborative flow.
  const onReconnect: OnReconnect<CanvasEdge> = useCallback(
    (oldEdge, newConnection) => {
      reactFlow.setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds))
    },
    [reactFlow],
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

      const position = reactFlow.screenToFlowPosition({
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

      reactFlow.addNodes([newNode])
    },
    [reactFlow],
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
        onReconnect={onReconnect}
        onDelete={onDelete}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        connectionMode={ConnectionMode.Loose}
        // Match the in-progress connection preview to the final edge: clean
        // right angles instead of the default awkward bezier curve.
        connectionLineType={ConnectionLineType.SmoothStep}
        colorMode="dark"
        fitView
      >
        <Background variant={BackgroundVariant.Dots} />
        <MiniMap />
        <ShapePanel />
        <CanvasControls />
      </ReactFlow>

      <StarterTemplatesModal
        open={templatesOpen}
        onOpenChange={onTemplatesOpenChange}
        onImport={handleImportTemplate}
      />
    </div>
  )
}
