import type { NodeShape } from "@/types/canvas"

/** Shapes drawn as scalable inline SVG rather than CSS borders. */
const SVG_SHAPES = new Set<NodeShape>(["diamond", "hexagon", "cylinder"])

/** True when a shape is rendered with SVG geometry instead of CSS styling. */
export function isSvgShape(shape: NodeShape): boolean {
  return SVG_SHAPES.has(shape)
}

interface ShapeVisualProps {
  shape: NodeShape
  /** Shape fill color. */
  fill: string
  /** Border / stroke color. */
  stroke: string
}

/**
 * Presentational shape geometry shared by the canvas node renderer and the
 * shape-panel drag ghost. Fills its positioned parent (`absolute inset-0`), so
 * callers control the size. SVG shapes use a `0 0 100 100` viewBox with
 * `preserveAspectRatio="none"` so the geometry stretches to any node size,
 * while `vector-effect="non-scaling-stroke"` keeps the border an even width.
 */
export function ShapeVisual({ shape, fill, stroke }: ShapeVisualProps) {
  if (isSvgShape(shape)) {
    return (
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {shape === "diamond" && (
          <polygon
            points="50,2 98,50 50,98 2,50"
            fill={fill}
            stroke={stroke}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {shape === "hexagon" && (
          <polygon
            points="25,2 75,2 98,50 75,98 25,98 2,50"
            fill={fill}
            stroke={stroke}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {shape === "cylinder" && (
          <g fill={fill} stroke={stroke} strokeWidth={1.5}>
            <path
              d="M2,12 L2,88 A48,12 0 0 0 98,88 L98,12"
              vectorEffect="non-scaling-stroke"
            />
            <ellipse
              cx="50"
              cy="12"
              rx="48"
              ry="12"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )}
      </svg>
    )
  }

  // rectangle / pill / circle — CSS shapes differ only by border radius.
  const borderRadius =
    shape === "circle" ? "50%" : shape === "pill" ? "9999px" : "0.75rem"

  return (
    <div
      className="absolute inset-0 h-full w-full border"
      style={{ backgroundColor: fill, borderColor: stroke, borderRadius }}
    />
  )
}
