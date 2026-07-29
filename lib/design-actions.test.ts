import assert from "node:assert/strict";
import { test } from "node:test";

import { NODE_SHAPES, type NodeShape } from "@/types/canvas";

import { DESIGN_GRID } from "./design-layout";
import { NODE_SIZE_NAMES, resolveNodeSize } from "./design-actions";

// Regression test for the "diamond node grid overflow" review fix: a node
// resolved at any shape/size combination must fit inside its DESIGN_GRID
// cell (minus clearance), or it visually overlaps the neighbouring cell.
test("resolveNodeSize never exceeds the design grid cell, for every shape and size", () => {
  const overflowing: string[] = [];

  for (const shape of NODE_SHAPES as readonly NodeShape[]) {
    for (const size of NODE_SIZE_NAMES) {
      const { width, height } = resolveNodeSize(shape, size);

      if (width >= DESIGN_GRID.columnWidth || height >= DESIGN_GRID.rowHeight) {
        overflowing.push(
          `${shape}/${size}: ${width}x${height} vs cell ${DESIGN_GRID.columnWidth}x${DESIGN_GRID.rowHeight}`
        );
      }
    }
  }

  assert.deepEqual(overflowing, []);
});

test("resolveNodeSize('diamond', 'large') is clamped below its old unclamped 270x270", () => {
  // Before the fix, MAX_NODE_SIZE was a flat 400x400, so a large diamond
  // (180x180 base * 1.5 scale = 270x270) sailed straight through the clamp
  // and overflowed the 240px-tall grid row. Confirm it is now capped well
  // under that, inside the row height.
  const { width, height } = resolveNodeSize("diamond", "large");

  assert.ok(height < 270, `expected height < 270, got ${height}`);
  assert.ok(height < DESIGN_GRID.rowHeight, `expected height < ${DESIGN_GRID.rowHeight}, got ${height}`);
});
