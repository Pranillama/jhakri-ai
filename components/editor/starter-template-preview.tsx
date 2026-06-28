import {
  DEFAULT_NODE_COLOR,
  NODE_COLORS,
  type CanvasNode,
} from "@/types/canvas"
import { EDGE_STROKE } from "./canvas/canvas-edge"
import type { CanvasTemplate } from "./starter-templates"

/** Padding (in template coordinate space) around the diagram bounds. */
const PADDING = 32

function resolveColor(fill: string) {
  return NODE_COLORS.find((c) => c.fill === fill) ?? DEFAULT_NODE_COLOR
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
  cx: number
  cy: number
}

function nodeRect(node: CanvasNode): Rect {
  const width = Number(node.style?.width ?? 0)
  const height = Number(node.style?.height ?? 0)
  return {
    x: node.position.x,
    y: node.position.y,
    width,
    height,
    cx: node.position.x + width / 2,
    cy: node.position.y + height / 2,
  }
}

/** Bounding box covering every node (including its width/height). */
function getBounds(nodes: CanvasNode[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const node of nodes) {
    const { x, y, width, height } = nodeRect(node)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + width)
    maxY = Math.max(maxY, y + height)
  }
  return { minX, minY, maxX, maxY }
}

function points(coords: Array<[number, number]>): string {
  return coords.map(([x, y]) => `${x},${y}`).join(" ")
}

/** A single node drawn as its shape, filled and outlined from its color data. */
function PreviewNode({ node }: { node: CanvasNode }) {
  const { x, y, width, height, cx, cy } = nodeRect(node)
  const color = resolveColor(node.data.color)
  const shape = node.data.shape

  const common = {
    fill: color.fill,
    stroke: color.text,
    strokeWidth: 1.5,
    vectorEffect: "non-scaling-stroke" as const,
  }

  switch (shape) {
    case "circle":
      return <ellipse cx={cx} cy={cy} rx={width / 2} ry={height / 2} {...common} />
    case "pill":
      return (
        <rect x={x} y={y} width={width} height={height} rx={height / 2} {...common} />
      )
    case "diamond":
      return (
        <polygon
          points={points([
            [cx, y],
            [x + width, cy],
            [cx, y + height],
            [x, cy],
          ])}
          {...common}
        />
      )
    case "hexagon":
      return (
        <polygon
          points={points([
            [x + width * 0.25, y],
            [x + width * 0.75, y],
            [x + width, cy],
            [x + width * 0.75, y + height],
            [x + width * 0.25, y + height],
            [x, cy],
          ])}
          {...common}
        />
      )
    case "cylinder": {
      const ry = height * 0.12
      const rx = width / 2
      return (
        <g {...common}>
          <path
            d={`M ${x},${y + ry} L ${x},${y + height - ry} A ${rx},${ry} 0 0 0 ${
              x + width
            },${y + height - ry} L ${x + width},${y + ry}`}
            vectorEffect="non-scaling-stroke"
          />
          <ellipse
            cx={cx}
            cy={y + ry}
            rx={rx}
            ry={ry}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      )
    }
    default:
      return (
        <rect x={x} y={y} width={width} height={height} rx={12} {...common} />
      )
  }
}

/**
 * Lightweight, static diagram preview for a starter template. Renders into a
 * single SVG whose `viewBox` is the template's node bounds, so the diagram is
 * scaled to fit any fixed-size container via `preserveAspectRatio`. Edges are
 * drawn as plain lines between node centers; nodes are drawn from their shape
 * and color data. No React Flow instance is involved.
 */
export function StarterTemplatePreview({
  template,
}: {
  template: CanvasTemplate
}) {
  const { nodes, edges } = template
  if (nodes.length === 0) return null

  const { minX, minY, maxX, maxY } = getBounds(nodes)
  const viewBox = [
    minX - PADDING,
    minY - PADDING,
    maxX - minX + PADDING * 2,
    maxY - minY + PADDING * 2,
  ].join(" ")

  const byId = new Map(nodes.map((node) => [node.id, node]))

  return (
    <svg
      className="h-full w-full"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {/* Edges first, so node shapes drawn afterwards occlude the line ends. */}
      {edges.map((edge) => {
        const source = byId.get(edge.source)
        const target = byId.get(edge.target)
        if (!source || !target) return null
        const from = nodeRect(source)
        const to = nodeRect(target)
        return (
          <line
            key={edge.id}
            x1={from.cx}
            y1={from.cy}
            x2={to.cx}
            y2={to.cy}
            stroke={EDGE_STROKE}
            strokeWidth={1.25}
            strokeOpacity={0.55}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )
      })}

      {nodes.map((node) => (
        <PreviewNode key={node.id} node={node} />
      ))}
    </svg>
  )
}
