import type { NodeSize } from "@/types/canvas";

/**
 * The AI design agent places nodes on a fixed grid rather than at free-form
 * pixel coordinates. The model only ever chooses a column and a row; this
 * module turns that into a position.
 *
 * That split is what makes "generated designs follow the layout and spacing
 * rules" a guarantee instead of a request — a model can ignore a prompt asking
 * for even spacing, but it cannot produce an overlapping layout when it never
 * gets to pick pixels. Cells are wider than the widest node (200px) and taller
 * than the tallest (180px), so neighbouring nodes always keep clear air between
 * them.
 */
export const DESIGN_GRID = {
  /** Horizontal distance between column centers. */
  columnWidth: 320,
  /** Vertical distance between row centers. */
  rowHeight: 240,
} as const;

/** A grid coordinate the model works in. */
export interface GridCell {
  column: number;
  row: number;
}

/**
 * Converts a grid cell into a React Flow position. The node is centered inside
 * its cell, so shapes of different sizes still line up down a column and across
 * a row regardless of which shape sits where.
 */
export function positionForCell(
  cell: GridCell,
  size: NodeSize,
): { x: number; y: number } {
  return {
    x: cell.column * DESIGN_GRID.columnWidth + (DESIGN_GRID.columnWidth - size.width) / 2,
    y: cell.row * DESIGN_GRID.rowHeight + (DESIGN_GRID.rowHeight - size.height) / 2,
  };
}

/**
 * Best-effort inverse of `positionForCell`, used to describe the existing
 * canvas to the model in the same grid coordinates it answers in — including
 * nodes a human placed by hand, which land wherever they were dropped.
 */
export function cellForPosition(
  position: { x: number; y: number },
  size: NodeSize,
): GridCell {
  return {
    column: Math.round(
      (position.x + size.width / 2 - DESIGN_GRID.columnWidth / 2) /
        DESIGN_GRID.columnWidth,
    ),
    row: Math.round(
      (position.y + size.height / 2 - DESIGN_GRID.rowHeight / 2) /
        DESIGN_GRID.rowHeight,
    ),
  };
}
