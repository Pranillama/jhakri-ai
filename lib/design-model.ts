import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";

import {
  DEFAULT_SHAPE_SIZES,
  NODE_COLOR_NAMES,
  NODE_SHAPES,
  type NodeShape,
} from "@/types/canvas";

import {
  describeCanvas,
  designPlanSchema,
  NODE_SIZE_NAMES,
  type CanvasSnapshot,
  type DesignPlan,
} from "./design-actions";
import { DESIGN_GRID } from "./design-layout";

/**
 * Gemini model used for design generation. Flash is the right trade-off here:
 * the task is structured extraction over a short prompt, and the run is
 * user-visible on a live canvas, so latency matters more than depth. Pinned to
 * a specific version rather than a `-latest` alias so a model rotation can't
 * silently change what the agent draws.
 */
const DESIGN_MODEL = "gemini-3.5-flash";

/**
 * Transient provider failures are retried inside the model call rather than by
 * retrying the whole task — see the note on `retry` in `trigger/design-agent.ts`.
 */
const MODEL_MAX_RETRIES = 2;

/**
 * Hard ceiling on the response. A plan for even a large diagram is a few
 * thousand tokens; anything beyond this is a degenerate generation, and it is
 * better to fail fast than to spend a minute filling a token budget.
 */
const MODEL_MAX_OUTPUT_TOKENS = 8192;

/**
 * The API key env var. `GEMINI_API_KEY` is the name used in this project's
 * setup notes, `GOOGLE_AI_API_KEY` is what `.env.local` actually carries, and
 * `GOOGLE_GENERATIVE_AI_API_KEY` is the AI SDK's own default — all three are
 * accepted so the task works whichever one an environment sets.
 */
function resolveApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_AI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!key) {
    throw new Error(
      "A Gemini API key is required. Set GEMINI_API_KEY (or GOOGLE_AI_API_KEY).",
    );
  }

  return key;
}

/**
 * What each shape means, keyed by shape so a new entry in `NODE_SHAPES` is a
 * compile error here rather than a shape the model is never told about.
 */
const SHAPE_MEANINGS: Record<NodeShape, string> = {
  rectangle: "general-purpose component or service",
  diamond: "decision point or gateway",
  circle: "event, trigger, or endpoint",
  pill: "running service or process",
  cylinder: "database, cache, or storage",
  hexagon: "external system or trust boundary",
};

const SHAPE_GUIDE = NODE_SHAPES.map(
  (shape) => `${shape} - ${SHAPE_MEANINGS[shape]}`,
).join("\n");

/**
 * The agent's operating rules. Shapes, colors, and layout are constrained here
 * *and* enforced afterwards by `normalizeDesignActions` and `positionForCell` —
 * the prompt explains the intent, the code guarantees the outcome.
 */
const SYSTEM_PROMPT = `You are the design agent for Jhakri AI, a collaborative system-design canvas. You translate a user's plain-English request into concrete edits on a shared architecture diagram.

You reply with a summary and one list per kind of change. Leave a list empty when that kind of change isn't needed:
- addNodes: id, label, shape, color, column, row
- updateNodes: id, plus any of label, shape, color
- moveNodes: id, column, row
- resizeNodes: id, size (${NODE_SIZE_NAMES.join(", ")})
- deleteNodes: id
- addEdges: id, source, target, and optionally label
- deleteEdges: id

New nodes are sized automatically from their shape, so only use resizeNodes when the user explicitly asks for a node to be bigger or smaller.

Node IDs you create must be short, lowercase, hyphenated, and descriptive (e.g. "api-gateway", "orders-db"). Edge IDs follow "source-to-target" (e.g. "api-gateway-to-orders-db"). To edit or remove something that already exists, use the exact ID listed in the current canvas.

Labels are short — a component name, not a description. Keep them to a few words on a single line.

Shapes — use only these, chosen by meaning:
${SHAPE_GUIDE}

Colors — use only these palette names: ${NODE_COLOR_NAMES.join(", ")}. Give each tier of the system one color and keep it consistent: entry points and clients in blue, application services in purple or teal, data stores in green, queues and async infrastructure in orange, external or third-party systems in neutral, and anything representing failure or a security boundary in red.

Layout — you place nodes on a grid, not in pixels. Column increases left to right, row increases top to bottom, and both may be negative. Rules:
- Lay the system out in the direction it flows: clients and ingress on the left, application services in the middle, storage and downstream systems on the right.
- Put components that sit at the same tier in the same column, one per row.
- Never put two nodes in the same cell. Every node needs its own column/row pair.
- Keep the diagram compact — prefer adding a row over stretching a column far away.
- When extending an existing diagram, place new nodes in free cells near what they connect to, and leave existing nodes where they are unless the user asks you to rearrange.

Edges — connect every node you add to the rest of the system. Direction follows the flow of a request or of data. Label an edge only when the label adds information the two node names don't already carry (e.g. "publishes", "read replica", "on failure").

Scope — do exactly what the user asked. Don't redesign parts of the diagram they didn't mention, and don't delete anything unless they asked you to. If the request is already satisfied by the current canvas, return empty lists and say so in the summary.

The summary is one short sentence, written for a teammate watching the canvas update (e.g. "Added an API gateway in front of the three services").`;

export interface GenerateDesignPlanOptions {
  prompt: string;
  snapshot: CanvasSnapshot;
  /** Aborts the model call when the run is cancelled or times out. */
  signal?: AbortSignal;
}

/**
 * Asks Gemini to turn the user's prompt into a design plan. The returned plan
 * is schema-valid but not yet checked against the canvas — pass it through
 * `normalizeDesignActions` before applying it.
 */
export async function generateDesignPlan({
  prompt,
  snapshot,
  signal,
}: GenerateDesignPlanOptions): Promise<DesignPlan> {
  const google = createGoogleGenerativeAI({ apiKey: resolveApiKey() });

  const { object } = await generateObject({
    model: google(DESIGN_MODEL),
    schema: designPlanSchema,
    system: SYSTEM_PROMPT,
    maxRetries: MODEL_MAX_RETRIES,
    maxOutputTokens: MODEL_MAX_OUTPUT_TOKENS,
    abortSignal: signal,
    prompt: [
      "Current canvas:",
      describeCanvas(snapshot),
      "",
      `Grid spacing is ${DESIGN_GRID.columnWidth}px per column and ${DESIGN_GRID.rowHeight}px per row; nodes render between ${DEFAULT_SHAPE_SIZES.circle.width}px and ${DEFAULT_SHAPE_SIZES.rectangle.width}px wide, so one node per cell always fits.`,
      "",
      "User request:",
      prompt,
    ].join("\n"),
  });

  return object;
}
