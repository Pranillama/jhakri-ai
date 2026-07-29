/**
 * Client-side entry point for starting an AI design run.
 *
 * Starting a run and being allowed to *watch* it are two separate server
 * concerns, and they already have two routes: `POST /api/ai/design` triggers the
 * background task and records the run against the caller, and
 * `POST /api/ai/design/token` verifies ownership of that recorded run before
 * minting a Trigger.dev public token scoped to it alone. This module is the one
 * place that chains them, so the UI gets a single call returning everything
 * `useRealtimeRun` needs and never has to know a token route exists.
 */

/** Everything needed to subscribe to a started design run. */
export interface DesignRunHandle {
  /** Trigger.dev run ID. */
  runId: string;
  /** Public access token scoped to reading that one run. */
  publicToken: string;
}

interface StartDesignRunInput {
  prompt: string;
  /** Liveblocks room ID — equal to the project ID (see architecture context). */
  roomId: string;
}

/**
 * Pulls the API's `{ error }` message off a failed response so the chat feed can
 * show what actually went wrong, falling back when the body isn't usable.
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
 * Triggers a design generation run for the room and returns its ID together with
 * a run-scoped access token. Throws with a user-presentable message on any
 * failure — the caller surfaces it in the chat feed.
 *
 * The room ID doubles as the project ID throughout this app (the create flow
 * uses one identifier for both), which is why a single `roomId` satisfies the
 * trigger route's project access gate.
 */
export async function startDesignRun({
  prompt,
  roomId,
}: StartDesignRunInput): Promise<DesignRunHandle> {
  const triggerResponse = await fetch("/api/ai/design", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, roomId, projectId: roomId }),
  });

  if (!triggerResponse.ok) {
    throw new Error(
      await readErrorMessage(
        triggerResponse,
        "Could not start the design run. Please try again."
      )
    );
  }

  const { runId } = (await triggerResponse.json()) as { runId?: unknown };
  if (typeof runId !== "string" || !runId) {
    throw new Error("The design run started without returning a run ID.");
  }

  const tokenResponse = await fetch("/api/ai/design/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ runId }),
  });

  if (!tokenResponse.ok) {
    throw new Error(
      await readErrorMessage(
        tokenResponse,
        "Could not subscribe to the design run."
      )
    );
  }

  const { token } = (await tokenResponse.json()) as { token?: unknown };
  if (typeof token !== "string" || !token) {
    throw new Error("The design run did not return an access token.");
  }

  return { runId, publicToken: token };
}
