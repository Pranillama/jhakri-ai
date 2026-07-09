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
import {
  useHistory,
  useRedo,
  useUndo,
  useUpdateMyPresence,
} from "@liveblocks/react"
import "@xyflow/react/dist/style.css"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
} from "react"

import { useCanvasAutosave, type SaveStatus } from "@/hooks/use-canvas-autosave"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { DEFAULT_NODE_COLOR, type CanvasNode, type CanvasEdge } from "@/types/canvas"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { CanvasNodeRenderer } from "./canvas-node"
import { CanvasControls } from "./canvas-controls"
import { CanvasEdgeRenderer, EDGE_STROKE } from "./canvas-edge"
import { LiveCursors } from "./live-cursors"
import { PresenceAvatars } from "./presence-avatars"
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
  /** Project ID — equal to the Liveblocks room ID; keys the canvas save/load API. */
  projectId: string
  /** Whether the starter templates modal is open. */
  templatesOpen: boolean
  /** Toggles the starter templates modal. */
  onTemplatesOpenChange: (open: boolean) => void
  /** Reports autosave status up to the navbar's save button. */
  onSaveStatusChange: (status: SaveStatus) => void
  /** Registers the manual-save function so the navbar's Save button can call it. */
  onRegisterSave: (save: () => void) => void
}

export function Canvas({
  projectId,
  templatesOpen,
  onTemplatesOpenChange,
  onSaveStatusChange,
  onRegisterSave,
}: CanvasProps) {
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
  const updateMyPresence = useUpdateMyPresence()

  useKeyboardShortcuts({ reactFlow, wrapperRef, onUndo: undo, onRedo: redo })

  // Loads the saved canvas exactly once per room connection: if the room
  // already has nodes/edges, another collaborator got there first and we skip
  // the load to avoid clobbering active work; otherwise fetch the last saved
  // graph (if any) and apply it as a single undo step.
  const [readyForAutosave, setReadyForAutosave] = useState(false)
  const initialLoadRef = useRef(false)

  useEffect(() => {
    if (initialLoadRef.current) return
    initialLoadRef.current = true

    // Fits the freshly loaded/existing graph into view exactly once, on
    // room connect — never on later drops. `<ReactFlow>`'s own `fitView`
    // prop can't express that distinction: it queues a fit until nodes first
    // become measurable, which fires the very first time *any* node appears,
    // including a node the user just dropped onto a previously empty canvas
    // (an unwanted zoom-on-drop, not a zoom-on-load).
    function fitLoadedView() {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          reactFlow.fitView({ duration: 300, padding: 0.2 })
        })
      })
    }

    async function loadSavedCanvas() {
      if (nodes.length > 0 || edges.length > 0) {
        fitLoadedView()
        setReadyForAutosave(true)
        return
      }

      try {
        const response = await fetch(`/api/projects/${projectId}/canvas`)
        if (response.ok) {
          const saved = (await response.json()) as {
            nodes: CanvasNode[]
            edges: CanvasEdge[]
          }
          if (saved.nodes.length > 0 || saved.edges.length > 0) {
            history.pause()
            reactFlow.setNodes(saved.nodes)
            reactFlow.setEdges(saved.edges)
            history.resume()
            fitLoadedView()
          }
        }
      } finally {
        setReadyForAutosave(true)
      }
    }

    loadSavedCanvas()
  }, [nodes, edges, reactFlow, history, projectId])

  const { status: saveStatus, save } = useCanvasAutosave({
    projectId,
    nodes,
    edges,
    enabled: readyForAutosave,
  })

  useEffect(() => {
    onSaveStatusChange(saveStatus)
  }, [saveStatus, onSaveStatusChange])

  useEffect(() => {
    onRegisterSave(save)
  }, [save, onRegisterSave])

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

  // Broadcast the cursor in flow coordinates so it lands in the same spot on
  // every collaborator's canvas regardless of their pan/zoom or viewport size.
  const handleMouseMove = useCallback(
    (event: ReactMouseEvent) => {
      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      updateMyPresence({ cursor: position })
    },
    [reactFlow, updateMyPresence],
  )

  const handleMouseLeave = useCallback(() => {
    updateMyPresence({ cursor: null })
  }, [updateMyPresence])

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()

      const raw = e.dataTransfer.getData("application/ghost-shape")
      if (!raw) return

      const payload: ShapeDragPayload = JSON.parse(raw)

      // screenToFlowPosition already accounts for the canvas container's
      // bounding rect and the current pan/zoom transform, converting the raw
      // client coordinates into flow-space. That gives us where the cursor
      // is, not where the node should be placed: node position is always the
      // top-left corner, but the drag ghost (see shape-panel.tsx's
      // setDragImage) is anchored at its center under the cursor. So the
      // cursor position has to be the node's center, not its corner —
      // offsetting by half the dropped size is what actually centers it.
      const cursor = reactFlow.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      })

      const position = {
        x: cursor.x - payload.width / 2,
        y: cursor.y - payload.height / 2,
      }

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
      className="relative h-full w-full"
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
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        connectionMode={ConnectionMode.Loose}
        // Match the in-progress connection preview to the final edge: clean
        // right angles instead of the default awkward bezier curve.
        connectionLineType={ConnectionLineType.SmoothStep}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} />
        <MiniMap />
        <ShapePanel />
        <CanvasControls />
        <LiveCursors />
      </ReactFlow>

      <PresenceAvatars />

      <StarterTemplatesModal
        open={templatesOpen}
        onOpenChange={onTemplatesOpenChange}
        onImport={handleImportTemplate}
      />
    </div>
  )
}
