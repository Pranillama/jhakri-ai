import {
  DEFAULT_EDGE_MARKER,
  DEFAULT_NODE_COLOR,
  DEFAULT_SHAPE_SIZES,
  NODE_COLOR_BY_NAME,
  type CanvasEdge,
  type CanvasNode,
  type NodeShape,
} from "@/types/canvas"

/**
 * A prebuilt canvas diagram a user can import as a starting point. Templates are
 * static snapshots that follow the same node/edge schema as user-created canvas
 * content, so importing one routes through the normal collaborative state.
 */
export interface CanvasTemplate {
  id: string
  name: string
  description: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

/**
 * Named accessors into the shared palette so template definitions can read
 * `COLOR.blue` instead of an opaque hex value.
 */
const COLOR = {
  neutral: NODE_COLOR_BY_NAME.neutral.fill,
  blue: NODE_COLOR_BY_NAME.blue.fill,
  purple: NODE_COLOR_BY_NAME.purple.fill,
  orange: NODE_COLOR_BY_NAME.orange.fill,
  red: NODE_COLOR_BY_NAME.red.fill,
  pink: NODE_COLOR_BY_NAME.pink.fill,
  green: NODE_COLOR_BY_NAME.green.fill,
  teal: NODE_COLOR_BY_NAME.teal.fill,
} as const

interface NodeSpec {
  id: string
  label: string
  x: number
  y: number
  /** Defaults to `rectangle`. */
  shape?: NodeShape
  /** A `fill` from `NODE_COLORS`; defaults to the neutral dark fill. */
  color?: string
}

/** Build a `CanvasNode`, defaulting shape, color, and per-shape size. */
function node(spec: NodeSpec): CanvasNode {
  const shape = spec.shape ?? "rectangle"
  const size = DEFAULT_SHAPE_SIZES[shape]
  return {
    id: spec.id,
    type: "canvasNode",
    position: { x: spec.x, y: spec.y },
    data: {
      label: spec.label,
      color: spec.color ?? DEFAULT_NODE_COLOR.fill,
      shape,
    },
    style: { width: size.width, height: size.height },
  }
}

/**
 * Build a `CanvasEdge` between two node ids. Carries the same arrow marker as
 * connection-drawn edges (see `DEFAULT_EDGE_OPTIONS` in `canvas.tsx`) so
 * imported edges render identically.
 */
function edge(source: string, target: string, label?: string): CanvasEdge {
  return {
    id: `${source}__${target}`,
    source,
    target,
    type: "canvasEdge",
    markerEnd: DEFAULT_EDGE_MARKER,
    data: label ? { label } : {},
  }
}

const microservices: CanvasTemplate = {
  id: "microservices",
  name: "Microservices",
  description:
    "An API gateway fronting independent services, each with its own datastore, plus an async message queue.",
  nodes: [
    node({ id: "client", label: "Client", x: 300, y: 0, color: COLOR.neutral }),
    node({
      id: "gateway",
      label: "API Gateway",
      x: 290,
      y: 180,
      shape: "hexagon",
      color: COLOR.purple,
    }),
    node({
      id: "auth",
      label: "Auth Service",
      x: 20,
      y: 360,
      shape: "pill",
      color: COLOR.teal,
    }),
    node({
      id: "orders",
      label: "Orders Service",
      x: 300,
      y: 360,
      shape: "pill",
      color: COLOR.green,
    }),
    node({
      id: "payments",
      label: "Payments Service",
      x: 580,
      y: 360,
      shape: "pill",
      color: COLOR.orange,
    }),
    node({
      id: "queue",
      label: "Message Queue",
      x: 20,
      y: 540,
      shape: "rectangle",
      color: COLOR.pink,
    }),
    node({
      id: "orders-db",
      label: "Orders DB",
      x: 320,
      y: 540,
      shape: "cylinder",
      color: COLOR.blue,
    }),
    node({
      id: "payments-db",
      label: "Payments DB",
      x: 600,
      y: 540,
      shape: "cylinder",
      color: COLOR.blue,
    }),
  ],
  edges: [
    edge("client", "gateway"),
    edge("gateway", "auth"),
    edge("gateway", "orders"),
    edge("gateway", "payments"),
    edge("orders", "orders-db"),
    edge("payments", "payments-db"),
    edge("orders", "queue", "events"),
    edge("payments", "queue", "events"),
  ],
}

const cicdPipeline: CanvasTemplate = {
  id: "cicd-pipeline",
  name: "CI/CD Pipeline",
  description:
    "A commit-to-production pipeline with build, test, an approval gate, and staged deploys backed by an artifact registry.",
  nodes: [
    node({
      id: "commit",
      label: "Git Push",
      x: 0,
      y: 120,
      shape: "circle",
      color: COLOR.neutral,
    }),
    node({ id: "build", label: "Build", x: 200, y: 110, color: COLOR.blue }),
    node({ id: "test", label: "Test", x: 460, y: 110, color: COLOR.purple }),
    node({
      id: "gate",
      label: "Approve?",
      x: 720,
      y: 70,
      shape: "diamond",
      color: COLOR.orange,
    }),
    node({
      id: "staging",
      label: "Deploy Staging",
      x: 980,
      y: 20,
      shape: "pill",
      color: COLOR.green,
    }),
    node({
      id: "prod",
      label: "Deploy Production",
      x: 980,
      y: 200,
      shape: "pill",
      color: COLOR.teal,
    }),
    node({
      id: "registry",
      label: "Artifact Registry",
      x: 460,
      y: 300,
      shape: "cylinder",
      color: COLOR.blue,
    }),
  ],
  edges: [
    edge("commit", "build"),
    edge("build", "test"),
    edge("test", "gate"),
    edge("test", "registry", "publish"),
    edge("gate", "staging", "yes"),
    edge("registry", "staging", "pull"),
    edge("staging", "prod", "promote"),
  ],
}

const aiApplication: CanvasTemplate = {
  id: "ai-application",
  name: "AI Application",
  description:
    "A retrieval-augmented LLM app: an orchestrator calls the model and a retriever backed by a vector database fed from ingested documents.",
  nodes: [
    node({
      id: "user",
      label: "User",
      x: 0,
      y: 140,
      shape: "circle",
      color: COLOR.neutral,
    }),
    node({ id: "app", label: "Web App", x: 200, y: 130, color: COLOR.blue }),
    node({
      id: "orchestrator",
      label: "Orchestrator",
      x: 460,
      y: 110,
      shape: "hexagon",
      color: COLOR.purple,
    }),
    node({
      id: "llm",
      label: "LLM (Claude)",
      x: 760,
      y: 0,
      shape: "pill",
      color: COLOR.teal,
    }),
    node({
      id: "retriever",
      label: "Retriever",
      x: 760,
      y: 240,
      shape: "pill",
      color: COLOR.green,
    }),
    node({
      id: "vector-db",
      label: "Vector DB",
      x: 1040,
      y: 240,
      shape: "cylinder",
      color: COLOR.blue,
    }),
    node({
      id: "embeddings",
      label: "Embedding Model",
      x: 760,
      y: 420,
      shape: "pill",
      color: COLOR.orange,
    }),
    node({
      id: "documents",
      label: "Document Store",
      x: 1040,
      y: 420,
      shape: "cylinder",
      color: COLOR.pink,
    }),
  ],
  edges: [
    edge("user", "app"),
    edge("app", "orchestrator"),
    edge("orchestrator", "llm", "prompt"),
    edge("orchestrator", "retriever", "query"),
    edge("retriever", "vector-db", "search"),
    edge("documents", "embeddings", "ingest"),
    edge("embeddings", "vector-db", "upsert"),
  ],
}

/** The curated starter template library shown in the import modal. */
export const CANVAS_TEMPLATES: readonly CanvasTemplate[] = [
  microservices,
  cicdPipeline,
  aiApplication,
]
