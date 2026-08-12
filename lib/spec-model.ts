import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

import type { ChatMessage } from "@/types/tasks";

import { resolveApiKey, SHAPE_MEANINGS } from "./design-model";
import type { NodeShape } from "@/types/canvas";

/**
 * Gemini model used for spec generation. Flash is the right trade-off here for
 * the same reason it is for the design agent: this is structured summarization
 * over a bounded prompt, not open-ended reasoning. Pinned to a specific version
 * rather than a `-latest` alias so a model rotation can't silently change spec
 * quality or structure.
 */
const SPEC_MODEL = "gemini-3.5-flash";

/**
 * Transient provider failures are retried inside the model call, same as
 * design generation — see `MODEL_MAX_RETRIES` in `lib/design-model.ts`.
 */
const MODEL_MAX_RETRIES = 2;

/**
 * Hard ceiling on the response. A Markdown spec for even a large diagram is a
 * few thousand tokens; beyond this is a degenerate generation.
 */
const MODEL_MAX_OUTPUT_TOKENS = 8192;

/**
 * The filename a generated spec is served under — used by the download route's
 * `Content-Disposition` header and by the specs list UI, so the two always
 * agree on what the file is called.
 */
export function specFilename(specId: string): string {
  return `spec-${specId}.md`;
}

/** The canvas fields spec generation actually needs to describe a component. */
export interface SpecCanvasNode {
  id: string;
  label: string;
  shape: NodeShape;
}

/** The canvas fields spec generation actually needs to describe a connection. */
export interface SpecCanvasEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

const SHAPE_GUIDE = (Object.keys(SHAPE_MEANINGS) as NodeShape[])
  .map((shape) => `${shape} - ${SHAPE_MEANINGS[shape]}`)
  .join("\n");

const SYSTEM_PROMPT = `You are the spec-writing agent for Jhakri AI, a collaborative system-design canvas. You turn the current architecture diagram and the conversation that shaped it into a clear Markdown technical specification.

Write only the spec itself: plain Markdown, starting with a top-level heading. Do not wrap the output in a code fence and do not add commentary before or after it.

Structure the spec with these sections, adapted to what the diagram actually contains:
- A title and a one-paragraph overview of what the system does.
- An "Architecture" section listing each component, grouped by role (entry points, application services, data stores, async infrastructure, external systems) using the shape meanings you're given below.
- A "Data Flow" section describing how requests or data move through the system, based on the connections between components.
- A "Notes" section capturing any specific requirements, constraints, or decisions mentioned in the conversation that aren't otherwise obvious from the diagram.

If the diagram is empty, say so plainly and summarize whatever was discussed in the conversation instead of inventing components that aren't there.

Shape meanings, for describing each component's role:
${SHAPE_GUIDE}`;

/** Renders the canvas graph as compact text for the prompt. */
function describeCanvas(
  nodes: readonly SpecCanvasNode[],
  edges: readonly SpecCanvasEdge[],
): string {
  if (nodes.length === 0 && edges.length === 0) {
    return "The canvas is empty.";
  }

  const labelById = new Map(nodes.map((node) => [node.id, node.label.trim() || node.id]));

  const nodeLines = nodes.map(
    (node) =>
      `- ${labelById.get(node.id)} (${node.shape} - ${SHAPE_MEANINGS[node.shape]})`,
  );

  const edgeLines = edges.map((edge) => {
    const source = labelById.get(edge.source) ?? edge.source;
    const target = labelById.get(edge.target) ?? edge.target;
    const label = edge.label?.trim();
    return `- ${source} -> ${target}${label ? ` (${label})` : ""}`;
  });

  return [
    `Components (${nodes.length}):`,
    nodeLines.join("\n") || "- none",
    "",
    `Connections (${edges.length}):`,
    edgeLines.join("\n") || "- none",
  ].join("\n");
}

/** Renders the room's chat history as compact text for the prompt. */
function describeChatHistory(chatHistory: readonly ChatMessage[]): string {
  if (chatHistory.length === 0) {
    return "No chat history.";
  }

  return chatHistory
    .map((message) => `- [${message.role}] ${message.sender}: ${message.content}`)
    .join("\n");
}

export interface GenerateSpecMarkdownOptions {
  chatHistory: readonly ChatMessage[];
  nodes: readonly SpecCanvasNode[];
  edges: readonly SpecCanvasEdge[];
  /** Aborts the model call when the run is cancelled or times out. */
  signal?: AbortSignal;
}

/**
 * Asks Gemini to turn the current canvas graph and chat history into a
 * Markdown technical spec. Returns the spec's raw Markdown text — the task
 * output is kept as plain Markdown, not a structured object, per the feature
 * spec.
 */
export async function generateSpecMarkdown({
  chatHistory,
  nodes,
  edges,
  signal,
}: GenerateSpecMarkdownOptions): Promise<string> {
  const google = createGoogleGenerativeAI({ apiKey: resolveApiKey() });

  const { text } = await generateText({
    model: google(SPEC_MODEL),
    system: SYSTEM_PROMPT,
    maxRetries: MODEL_MAX_RETRIES,
    maxOutputTokens: MODEL_MAX_OUTPUT_TOKENS,
    abortSignal: signal,
    prompt: [
      "Current architecture:",
      describeCanvas(nodes, edges),
      "",
      "Conversation that shaped this design:",
      describeChatHistory(chatHistory),
    ].join("\n"),
  });

  return text;
}
