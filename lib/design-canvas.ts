import { mutateFlow } from "@liveblocks/react-flow/node";

import {
  DEFAULT_EDGE_MARKER,
  DEFAULT_SHAPE_SIZES,
  NODE_COLOR_BY_NAME,
  type CanvasEdge,
  type CanvasNode,
  type NodeShape,
  type NodeSize,
} from "@/types/canvas";

import {
  resolveNodeSize,
  type CanvasSnapshot,
  type DesignAction,
} from "./design-actions";
import { positionForCell } from "./design-layout";
import { getLiveblocks } from "./liveblocks";

/** A point in React Flow's canvas coordinate space. */
interface Point {
  x: number;
  y: number;
}

/** What a run changed, used for the closing status message. */
export interface DesignChangeCounts {
  nodesAdded: number;
  nodesUpdated: number;
  nodesRemoved: number;
  edgesAdded: number;
  edgesRemoved: number;
}

export interface ApplyDesignActionsOptions {
  roomId: string;
  /** The canvas as it was read before the plan was generated. */
  snapshot: CanvasSnapshot;
  actions: readonly DesignAction[];
  /**
   * Called just before each action lands, with the point on the canvas it
   * affects — used to walk the agent's cursor across the diagram as it works.
   */
  onProgress?: (action: DesignAction, focus: Point | null) => Promise<void>;
}

function sizeOf(node: CanvasNode): NodeSize {
  const fallback = DEFAULT_SHAPE_SIZES[node.data.shape];
  return {
    width: Number(node.style?.width) || fallback.width,
    height: Number(node.style?.height) || fallback.height,
  };
}

function centerOf(position: Point, size: NodeSize): Point {
  return { x: position.x + size.width / 2, y: position.y + size.height / 2 };
}

/**
 * Reads the room's current graph. Uses the same `mutateFlow` utility as the
 * write path — passing a callback that mutates nothing — so reads and writes go
 * through one collaborative flow API rather than a second, divergent one.
 */
export async function readCanvasSnapshot(
  roomId: string,
): Promise<CanvasSnapshot> {
  let snapshot: CanvasSnapshot = { nodes: [], edges: [] };

  await mutateFlow<CanvasNode, CanvasEdge>(
    { client: getLiveblocks(), roomId },
    (flow) => {
      snapshot = { nodes: [...flow.nodes], edges: [...flow.edges] };
    },
  );

  return snapshot;
}

/**
 * Applies a validated design plan to the shared canvas.
 *
 * Each action is written in its own `mutateFlow` call rather than batched into
 * one. That is deliberate: the diagram then builds up in front of everyone in
 * the room, node by node, with the agent's cursor moving ahead of each change —
 * which is the point of running this on a collaborative canvas. A batched write
 * would make the whole design appear in a single jump.
 */
export async function applyDesignActions({
  roomId,
  snapshot,
  actions,
  onProgress,
}: ApplyDesignActionsOptions): Promise<DesignChangeCounts> {
  const client = getLiveblocks();

  const counts: DesignChangeCounts = {
    nodesAdded: 0,
    nodesUpdated: 0,
    nodesRemoved: 0,
    edgesAdded: 0,
    edgesRemoved: 0,
  };

  // Node centers, seeded from the snapshot and kept current as actions land, so
  // the agent's cursor can be aimed at each change without re-reading Storage.
  const centers = new Map<string, Point>();
  for (const node of snapshot.nodes) {
    centers.set(node.id, centerOf(node.position, sizeOf(node)));
  }

  for (const action of actions) {
    let focus: Point | null = null;

    if (action.type === "add_node") {
      const size = DEFAULT_SHAPE_SIZES[action.shape];
      focus = centerOf(positionForCell(action.cell, size), size);
    } else if (action.type === "move_node") {
      // Aim at where the node is going, not where it currently sits.
      const size = DEFAULT_SHAPE_SIZES.rectangle;
      focus = centerOf(positionForCell(action.cell, size), size);
    } else if (action.type === "add_edge") {
      focus = centers.get(action.target) ?? centers.get(action.source) ?? null;
    } else {
      focus = centers.get(action.id) ?? null;
    }

    await onProgress?.(action, focus);

    await mutateFlow<CanvasNode, CanvasEdge>({ client, roomId }, (flow) => {
      switch (action.type) {
        case "add_node": {
          const size = DEFAULT_SHAPE_SIZES[action.shape];
          const position = positionForCell(action.cell, size);

          flow.addNode({
            id: action.id,
            type: "canvasNode",
            position,
            data: {
              label: action.label,
              color: NODE_COLOR_BY_NAME[action.color].fill,
              shape: action.shape,
            },
            style: { width: size.width, height: size.height },
          });

          centers.set(action.id, centerOf(position, size));
          counts.nodesAdded += 1;
          break;
        }

        case "move_node": {
          const node = flow.getNode(action.id);
          if (!node) break;

          const size = sizeOf(node);
          const position = positionForCell(action.cell, size);
          flow.updateNode(action.id, { position });

          centers.set(action.id, centerOf(position, size));
          counts.nodesUpdated += 1;
          break;
        }

        case "resize_node": {
          const node = flow.getNode(action.id);
          if (!node) break;

          const size = resolveNodeSize(node.data.shape, action.size);
          flow.updateNode(action.id, { style: { ...node.style, ...size } });

          centers.set(action.id, centerOf(node.position, size));
          counts.nodesUpdated += 1;
          break;
        }

        case "update_node_data": {
          const node = flow.getNode(action.id);
          if (!node) break;

          flow.updateNodeData(action.id, {
            ...(action.label === undefined ? {} : { label: action.label }),
            ...(action.shape ? { shape: action.shape } : {}),
            ...(action.color
              ? { color: NODE_COLOR_BY_NAME[action.color].fill }
              : {}),
          });

          // A shape swap changes what size looks right. Only re-size a node
          // that is still at its old shape's default — if someone resized it by
          // hand, that choice is theirs to keep.
          if (action.shape && action.shape !== node.data.shape) {
            resizeForShapeChange(flow, node, action.shape);
          }

          counts.nodesUpdated += 1;
          break;
        }

        case "delete_node": {
          if (!flow.getNode(action.id)) break;

          // React Flow's client-side delete also drops connected edges; the
          // server-side flow API does not, and an edge pointing at a missing
          // node breaks rendering for everyone in the room.
          const orphaned = flow.edges
            .filter(
              (edge) => edge.source === action.id || edge.target === action.id,
            )
            .map((edge) => edge.id);

          flow.removeEdges(orphaned);
          flow.removeNode(action.id);

          centers.delete(action.id);
          counts.nodesRemoved += 1;
          counts.edgesRemoved += orphaned.length;
          break;
        }

        case "add_edge": {
          // The plan was validated against a snapshot taken before generation
          // started; a concurrent edit (e.g. another collaborator deleting a
          // node) can invalidate it mid-run. An edge pointing at a missing
          // node breaks rendering for everyone in the room, so re-check both
          // endpoints against the live flow before adding it.
          if (!flow.getNode(action.source) || !flow.getNode(action.target)) {
            break;
          }

          flow.addEdge({
            id: action.id,
            type: "canvasEdge",
            source: action.source,
            target: action.target,
            markerEnd: DEFAULT_EDGE_MARKER,
            data: action.label ? { label: action.label } : {},
          });

          counts.edgesAdded += 1;
          break;
        }

        case "delete_edge": {
          if (!flow.getEdge(action.id)) break;

          flow.removeEdge(action.id);
          counts.edgesRemoved += 1;
          break;
        }
      }
    });
  }

  return counts;
}

/** Narrow view of the mutable flow used by the shape-change resize helper. */
interface FlowNodeWriter {
  updateNode(id: string, partial: Partial<CanvasNode>): void;
}

function resizeForShapeChange(
  flow: FlowNodeWriter,
  node: CanvasNode,
  nextShape: NodeShape,
): void {
  const previousDefault = DEFAULT_SHAPE_SIZES[node.data.shape];
  const current = sizeOf(node);

  const isDefaultSized =
    current.width === previousDefault.width &&
    current.height === previousDefault.height;

  if (!isDefaultSized) return;

  const nextDefault = DEFAULT_SHAPE_SIZES[nextShape];
  flow.updateNode(node.id, {
    style: {
      ...node.style,
      width: nextDefault.width,
      height: nextDefault.height,
    },
  });
}
