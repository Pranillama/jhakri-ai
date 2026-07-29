import type { Edge, EdgeMarker, MarkerType, Node } from "@xyflow/react"

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

/**
 * Named accessors into `NODE_COLORS`. Anything that picks a color by meaning
 * rather than by index — starter templates, the AI design agent — resolves it
 * through this map, so the palette stays the single source of truth.
 */
export const NODE_COLOR_BY_NAME = {
  neutral: NODE_COLORS[0],
  blue: NODE_COLORS[1],
  purple: NODE_COLORS[2],
  orange: NODE_COLORS[3],
  red: NODE_COLORS[4],
  pink: NODE_COLORS[5],
  green: NODE_COLORS[6],
  teal: NODE_COLORS[7],
} as const satisfies Record<string, NodeColor>

/** A palette entry name — the keys of `NODE_COLOR_BY_NAME`. */
export type NodeColorName = keyof typeof NODE_COLOR_BY_NAME

/** Every palette name, in palette order. */
export const NODE_COLOR_NAMES = Object.keys(
  NODE_COLOR_BY_NAME,
) as NodeColorName[]

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

/** Width/height a node renders at. */
export interface NodeSize {
  width: number
  height: number
}

/**
 * Default render size per shape. Every path that creates a node — the shape
 * panel's drag-to-create, starter templates, and the AI design agent — sizes
 * from this map so nodes look the same however they got onto the canvas.
 */
export const DEFAULT_SHAPE_SIZES: Record<NodeShape, NodeSize> = {
  rectangle: { width: 200, height: 100 },
  diamond: { width: 180, height: 180 },
  circle: { width: 120, height: 120 },
  pill: { width: 200, height: 80 },
  cylinder: { width: 140, height: 120 },
  hexagon: { width: 160, height: 140 },
}

/**
 * Default edge stroke — a light, near-white line (documented in
 * `context/ui-context.md`). Kept thin so edges stay visually secondary to
 * nodes. Also tints the arrow marker on every edge.
 */
export const EDGE_STROKE = "#f8fafc"

/**
 * Arrow marker carried by every canvas edge, whether the edge was drawn by
 * hand, imported from a starter template, or added by the AI design agent.
 *
 * The marker type is written as its literal value instead of importing
 * `MarkerType` so this module keeps a type-only dependency on `@xyflow/react`.
 * The design agent imports these constants from a Node background task, where
 * pulling the React canvas library into the bundle would be both wasteful and
 * fragile.
 */
export const DEFAULT_EDGE_MARKER: EdgeMarker = {
  type: "arrowclosed" as unknown as MarkerType,
  color: EDGE_STROKE,
  width: 18,
  height: 18,
}

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
