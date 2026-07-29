import { z } from "zod";

import {
  DEFAULT_SHAPE_SIZES,
  NODE_COLOR_BY_NAME,
  NODE_COLOR_NAMES,
  NODE_SHAPES,
  type CanvasEdge,
  type CanvasNode,
  type NodeColorName,
  type NodeShape,
} from "@/types/canvas";

import { cellForPosition, DESIGN_GRID, type GridCell } from "./design-layout";

/**
 * Node sizes the agent can ask for, as multiples of the shape's default size.
 *
 * The agent names a size instead of giving pixel dimensions for the same reason
 * it names a palette color and a grid cell rather than a hex value and a raw
 * coordinate: every value it produces comes from a closed set, so there is no
 * open-ended numeric field for it to wander off in. That is not hypothetical —
 * asked for a free-form `width`, Gemini reliably emitted an ever-lengthening
 * integer and burned its entire output budget without finishing the plan.
 */
export const NODE_SIZE_SCALES = {
  small: 0.75,
  medium: 1,
  large: 1.5,
} as const;

export type NodeSizeName = keyof typeof NODE_SIZE_SCALES;

export const NODE_SIZE_NAMES = Object.keys(NODE_SIZE_SCALES) as NodeSizeName[];

/** Hard bounds on a node's rendered size, in pixels. */
const MIN_NODE_SIZE = { width: 80, height: 60 };
const GRID_CLEARANCE = 40;
const MAX_NODE_SIZE = {
  width: Math.min(400, DESIGN_GRID.columnWidth - GRID_CLEARANCE),
  height: Math.min(400, DESIGN_GRID.rowHeight - GRID_CLEARANCE),
};

/**
 * How far from the origin a node may be placed. Generous enough for any real
 * diagram, tight enough that a wild coordinate can't fling a node somewhere
 * nobody can scroll to.
 */
const MAX_GRID_DISTANCE = 200;

/** Resolves a named size against a shape's default dimensions. */
export function resolveNodeSize(
  shape: NodeShape,
  size: NodeSizeName,
): { width: number; height: number } {
  const base = DEFAULT_SHAPE_SIZES[shape];
  const scale = NODE_SIZE_SCALES[size];

  return {
    width: clamp(
      Math.round(base.width * scale),
      MIN_NODE_SIZE.width,
      MAX_NODE_SIZE.width,
    ),
    height: clamp(
      Math.round(base.height * scale),
      MIN_NODE_SIZE.height,
      MAX_NODE_SIZE.height,
    ),
  };
}

const shapeSchema = z.enum(NODE_SHAPES);
const colorSchema = z.enum(
  NODE_COLOR_NAMES as [NodeColorName, ...NodeColorName[]],
);
const sizeSchema = z.enum(NODE_SIZE_NAMES as [NodeSizeName, ...NodeSizeName[]]);
const columnSchema = z.number().int().describe("Grid column, left to right.");
const rowSchema = z.number().int().describe("Grid row, top to bottom.");

/**
 * Schema the model answers with: one array per kind of change, rather than a
 * single list of mixed action objects.
 *
 * This shape is the outcome of testing against Gemini, not a stylistic
 * preference. A discriminated union is the natural model, but Gemini's
 * structured output resolves `anyOf` loosely and invents its own property names
 * inside it. A single flat object with optional fields keeps the property names
 * but creates a worse problem: Gemini fills in *every* declared property, so on
 * an "add node" it has to invent an edge `target` — and what it invents is a
 * degenerate, ever-growing string that exhausts the output budget.
 *
 * Grouping by change type gives each object only the fields it actually needs.
 * Nothing has to be invented, and nothing is left to interpretation.
 *
 * Execution order is fixed by `flattenDesignPlan` rather than chosen by the
 * model — removals first, then nodes, then the edges that connect them.
 */
export const designPlanSchema = z.object({
  summary: z
    .string()
    .describe("One short sentence describing the change, for the status feed."),
  deleteEdges: z.array(z.object({ id: z.string() })),
  deleteNodes: z.array(z.object({ id: z.string() })),
  addNodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      shape: shapeSchema,
      color: colorSchema,
      column: columnSchema,
      row: rowSchema,
    }),
  ),
  updateNodes: z.array(
    z.object({
      id: z.string(),
      label: z.string().optional(),
      shape: shapeSchema.optional(),
      color: colorSchema.optional(),
    }),
  ),
  moveNodes: z.array(
    z.object({ id: z.string(), column: columnSchema, row: rowSchema }),
  ),
  resizeNodes: z.array(z.object({ id: z.string(), size: sizeSchema })),
  addEdges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      label: z.string().optional(),
    }),
  ),
});

export type DesignPlan = z.infer<typeof designPlanSchema>;

/** A validated action, narrowed to exactly the fields its type needs. */
export type DesignAction =
  | {
      type: "add_node";
      id: string;
      label: string;
      shape: NodeShape;
      color: NodeColorName;
      cell: GridCell;
    }
  | { type: "move_node"; id: string; cell: GridCell }
  | { type: "resize_node"; id: string; size: NodeSizeName }
  | {
      type: "update_node_data";
      id: string;
      label?: string;
      shape?: NodeShape;
      color?: NodeColorName;
    }
  | { type: "delete_node"; id: string }
  | {
      type: "add_edge";
      id: string;
      source: string;
      target: string;
      label?: string;
    }
  | { type: "delete_edge"; id: string };

/** The graph the plan is validated against. */
export interface CanvasSnapshot {
  nodes: readonly CanvasNode[];
  edges: readonly CanvasEdge[];
}

export interface NormalizedDesignPlan {
  actions: DesignAction[];
  /** Human-readable reasons for every change that was dropped. */
  skipped: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Keeps a generated cell on a grid a human could actually navigate to. */
function clampCell(column: number, row: number): GridCell {
  return {
    column: clamp(Math.round(column), -MAX_GRID_DISTANCE, MAX_GRID_DISTANCE),
    row: clamp(Math.round(row), -MAX_GRID_DISTANCE, MAX_GRID_DISTANCE),
  };
}

function cellKey(cell: GridCell): string {
  return `${cell.column},${cell.row}`;
}

/** Collapses whitespace so a multi-line label renders as one clean line. */
function cleanLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Tracks which grid cells are taken and hands out free ones, so "never put two
 * nodes in the same cell" holds even when the model asks for a cell twice.
 */
class CellAllocator {
  readonly #taken = new Set<string>();

  occupy(cell: GridCell): void {
    this.#taken.add(cellKey(cell));
  }

  release(cell: GridCell): void {
    this.#taken.delete(cellKey(cell));
  }

  /** Returns the requested cell, or the nearest free one below it. */
  claim(requested: GridCell): GridCell {
    let cell = requested;

    while (this.#taken.has(cellKey(cell)) && cell.row < MAX_GRID_DISTANCE) {
      cell = { column: cell.column, row: cell.row + 1 };
    }

    this.occupy(cell);
    return cell;
  }
}

/**
 * Validates a plan against the live canvas and flattens it into typed actions
 * in the order they must be applied: removals first (so an ID can be reused),
 * then new nodes, then edits to nodes, then the edges that join them.
 *
 * Invalid changes are dropped rather than throwing — a plan with one bad edge
 * should still add the nine good nodes — and every drop is reported so it lands
 * in the run log.
 */
export function flattenDesignPlan(
  plan: DesignPlan,
  snapshot: CanvasSnapshot,
): NormalizedDesignPlan {
  const nodeIds = new Set(snapshot.nodes.map((node) => node.id));
  const edgeIds = new Set(snapshot.edges.map((edge) => edge.id));

  const cells = new CellAllocator();
  const cellById = new Map<string, GridCell>();
  for (const node of snapshot.nodes) {
    const shape = node.data.shape;
    const cell = cellForPosition(node.position, {
      width: Number(node.style?.width) || DEFAULT_SHAPE_SIZES[shape].width,
      height: Number(node.style?.height) || DEFAULT_SHAPE_SIZES[shape].height,
    });
    cells.occupy(cell);
    cellById.set(node.id, cell);
  }

  const actions: DesignAction[] = [];
  const skipped: string[] = [];

  for (const { id } of plan.deleteEdges) {
    if (!edgeIds.has(id)) {
      skipped.push(`delete edge ${id}: unknown edge`);
      continue;
    }
    actions.push({ type: "delete_edge", id });
    edgeIds.delete(id);
  }

  for (const { id } of plan.deleteNodes) {
    if (!nodeIds.has(id)) {
      skipped.push(`delete node ${id}: unknown node`);
      continue;
    }

    actions.push({ type: "delete_node", id });
    nodeIds.delete(id);

    const cell = cellById.get(id);
    if (cell) {
      cells.release(cell);
      cellById.delete(id);
    }

    // Deleting a node takes its edges with it (see `applyDesignActions`), so
    // those IDs must stop counting as live here too.
    for (const edge of snapshot.edges) {
      if (edge.source === id || edge.target === id) edgeIds.delete(edge.id);
    }
  }

  for (const node of plan.addNodes) {
    const id = node.id.trim();
    if (!id) {
      skipped.push("add node: missing id");
      continue;
    }
    if (nodeIds.has(id)) {
      skipped.push(`add node ${id}: a node with that id already exists`);
      continue;
    }

    const cell = cells.claim(clampCell(node.column, node.row));

    actions.push({
      type: "add_node",
      id,
      label: cleanLabel(node.label) || id,
      shape: node.shape,
      color: node.color,
      cell,
    });

    nodeIds.add(id);
    cellById.set(id, cell);
  }

  for (const update of plan.updateNodes) {
    const id = update.id.trim();
    if (!nodeIds.has(id)) {
      skipped.push(`update node ${id}: unknown node`);
      continue;
    }

    const label =
      update.label === undefined ? undefined : cleanLabel(update.label);

    if (label === undefined && !update.shape && !update.color) {
      skipped.push(`update node ${id}: nothing to update`);
      continue;
    }

    actions.push({
      type: "update_node_data",
      id,
      ...(label === undefined ? {} : { label }),
      ...(update.shape ? { shape: update.shape } : {}),
      ...(update.color ? { color: update.color } : {}),
    });
  }

  for (const move of plan.moveNodes) {
    const id = move.id.trim();
    if (!nodeIds.has(id)) {
      skipped.push(`move node ${id}: unknown node`);
      continue;
    }

    const from = cellById.get(id);
    if (from) cells.release(from);

    const cell = cells.claim(clampCell(move.column, move.row));
    actions.push({ type: "move_node", id, cell });
    cellById.set(id, cell);
  }

  for (const resize of plan.resizeNodes) {
    const id = resize.id.trim();
    if (!nodeIds.has(id)) {
      skipped.push(`resize node ${id}: unknown node`);
      continue;
    }

    actions.push({ type: "resize_node", id, size: resize.size });
  }

  for (const edge of plan.addEdges) {
    const id = edge.id.trim();
    const source = edge.source.trim();
    const target = edge.target.trim();

    if (!id || !source || !target) {
      skipped.push(`add edge ${id || "(no id)"}: missing id/source/target`);
      continue;
    }
    if (!nodeIds.has(source) || !nodeIds.has(target)) {
      skipped.push(`add edge ${id}: connects an unknown node`);
      continue;
    }
    if (source === target) {
      skipped.push(`add edge ${id}: source and target are the same node`);
      continue;
    }
    if (edgeIds.has(id)) {
      skipped.push(`add edge ${id}: an edge with that id already exists`);
      continue;
    }

    const label = edge.label ? cleanLabel(edge.label) : undefined;
    actions.push({
      type: "add_edge",
      id,
      source,
      target,
      ...(label ? { label } : {}),
    });
    edgeIds.add(id);
  }

  return { actions, skipped };
}

/** Reverse-maps a node fill back to its palette name for the canvas summary. */
function colorNameForFill(fill: string): NodeColorName {
  const match = NODE_COLOR_NAMES.find(
    (name) => NODE_COLOR_BY_NAME[name].fill === fill,
  );
  return match ?? "neutral";
}

/**
 * Renders the current canvas as compact text for the prompt. Positions are
 * reported as grid cells rather than pixels so the model reads the canvas in
 * the same coordinate system it writes in.
 */
export function describeCanvas(snapshot: CanvasSnapshot): string {
  if (snapshot.nodes.length === 0 && snapshot.edges.length === 0) {
    return "The canvas is empty.";
  }

  const nodeLines = snapshot.nodes.map((node) => {
    const shape = node.data.shape;
    const cell = cellForPosition(node.position, {
      width: Number(node.style?.width) || DEFAULT_SHAPE_SIZES[shape].width,
      height: Number(node.style?.height) || DEFAULT_SHAPE_SIZES[shape].height,
    });
    const label = node.data.label.trim() || "(no label)";

    return `- id="${node.id}" label="${label}" shape=${shape} color=${colorNameForFill(
      node.data.color,
    )} column=${cell.column} row=${cell.row}`;
  });

  const edgeLines = snapshot.edges.map((edge) => {
    const label = edge.data?.label?.trim();
    return `- id="${edge.id}" ${edge.source} -> ${edge.target}${
      label ? ` label="${label}"` : ""
    }`;
  });

  return [
    `Nodes (${snapshot.nodes.length}):`,
    nodeLines.join("\n") || "- none",
    "",
    `Edges (${snapshot.edges.length}):`,
    edgeLines.join("\n") || "- none",
  ].join("\n");
}
