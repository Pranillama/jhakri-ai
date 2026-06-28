import type { Edge, Node } from "@xyflow/react"

/** A dark node fill paired with a vivid, readable text color. */
export interface NodeColor {
  fill: string
  text: string
}

/**
 * Canvas node color palette — 8 dark fills, each paired with a contrasting text
 * color tuned for readability on the dark canvas. The first entry is the
 * default. Documented in `context/ui-context.md`.
 */
export const NODE_COLORS: readonly NodeColor[] = [
  { fill: "#1F1F1F", text: "#EDEDED" }, // neutral dark (default)
  { fill: "#10233D", text: "#52A8FF" }, // blue
  { fill: "#2E1938", text: "#BF7AF0" }, // purple
  { fill: "#331B00", text: "#FF990A" }, // orange
  { fill: "#3C1618", text: "#FF6166" }, // red
  { fill: "#3A1726", text: "#F75F8F" }, // pink
  { fill: "#0F2E18", text: "#62C073" }, // green
  { fill: "#062822", text: "#0AC7B4" }, // teal
] as const

/** Default node color (neutral dark). */
export const DEFAULT_NODE_COLOR: NodeColor = NODE_COLORS[0]

/** Supported node shapes. Documented in `context/ui-context.md`. */
export const NODE_SHAPES = [
  "rectangle", // default general-purpose node
  "diamond", // decision / gateway
  "circle", // event / endpoint
  "pill", // service / process
  "cylinder", // database / storage
  "hexagon", // external system / boundary
] as const

/** A node shape identifier. */
export type NodeShape = (typeof NODE_SHAPES)[number]

/**
 * Data carried by a canvas node. Declared as a type alias (not an interface) so
 * it satisfies React Flow's `Record<string, unknown>` node-data constraint.
 */
export type CanvasNodeData = {
  /** Text label rendered inside the node. */
  label: string
  /** Node fill color — a `fill` value from `NODE_COLORS`. */
  color: string
  /** Visual shape of the node. */
  shape: NodeShape
}

/** Custom React Flow node type used across the canvas. */
export type CanvasNode = Node<CanvasNodeData, "canvasNode">

/**
 * Data carried by a canvas edge. Declared as a type alias (not an interface) so
 * it satisfies React Flow's `Record<string, unknown>` edge-data constraint.
 */
export type CanvasEdgeData = {
  /** Optional inline label rendered along the edge. */
  label?: string
}

/** Custom React Flow edge type used across the canvas. */
export type CanvasEdge = Edge<CanvasEdgeData, "canvasEdge">
