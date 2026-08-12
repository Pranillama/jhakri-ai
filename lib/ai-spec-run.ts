/**
 * Client-side entry point for starting an AI spec generation run. Mirrors
 * `lib/ai-design-run.ts`'s two-call chain exactly: `POST /api/ai/spec`
 * triggers the background task and records the run against the caller, and
 * `POST /api/ai/spec/token` verifies ownership of that recorded run before
 * minting a Trigger.dev public token scoped to it alone.
 */

import type { CanvasEdge, CanvasNode } from "@/types/canvas";
import type { ChatMessage } from "@/types/tasks";

/** Everything needed to subscribe to a started spec run. */
export interface SpecRunHandle {
  /** Trigger.dev run ID. */
  runId: string;
  /** Public access token scoped to reading that one run. */
  publicToken: string;
}

interface StartSpecRunInput {
  /** Liveblocks room ID — equal to the project ID (see architecture context). */
  roomId: string;
  chatHistory: readonly ChatMessage[];
  nodes: readonly CanvasNode[];
  edges: readonly CanvasEdge[];
}

/**
 * Pulls the API's `{ error }` message off a failed response, falling back
 * when the body isn't usable.
 */
async function readErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  const body: unknown = await response.json().catch(() => null);

  if (body && typeof body === "object" && "error" in body) {
    const { error } = body as { error?: unknown };
    if (typeof error === "string" && error.trim()) {
      return error.trim();
    }
  }

  return fallback;
}

/**
 * Triggers a spec generation run for the room and returns its ID together
 * with a run-scoped access token. Throws with a user-presentable message on
 * any failure — the caller surfaces it in the chat feed.
 */
export async function startSpecRun({
  roomId,
  chatHistory,
  nodes,
  edges,
}: StartSpecRunInput): Promise<SpecRunHandle> {
  const triggerResponse = await fetch("/api/ai/spec", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, chatHistory, nodes, edges }),
  });

  if (!triggerResponse.ok) {
    throw new Error(
      await readErrorMessage(
        triggerResponse,
        "Could not start spec generation. Please try again."
      )
    );
  }

  const { runId } = (await triggerResponse.json()) as { runId?: unknown };
  if (typeof runId !== "string" || !runId) {
    throw new Error("Spec generation started without returning a run ID.");
  }

  const tokenResponse = await fetch("/api/ai/spec/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ runId }),
  });

  if (!tokenResponse.ok) {
    throw new Error(
      await readErrorMessage(tokenResponse, "Could not subscribe to the spec run.")
    );
  }

  const { token } = (await tokenResponse.json()) as { token?: unknown };
  if (typeof token !== "string" || !token) {
    throw new Error("The spec run did not return an access token.");
  }

  return { runId, publicToken: token };
}
