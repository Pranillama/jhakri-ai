import { LiveblocksError } from "@liveblocks/node";

import { AI_AGENT } from "@/types/ai-status";
import {
  AI_STATUS_FEED_ID,
  aiStatusMessageSchema,
  type AiRunState,
  type AiTaskKind,
} from "@/types/tasks";

import { getLiveblocks } from "./liveblocks";

/**
 * Seconds the agent's ephemeral presence survives without a refresh. Every
 * status update renews it, so the agent stays visible for as long as the run is
 * making progress and disappears on its own if the run dies mid-flight without
 * getting to clear itself. (Liveblocks allows 2–3599.)
 */
const PRESENCE_TTL_SECONDS = 90;

/** Short TTL used when the run ends, so the agent leaves the room promptly. */
const PRESENCE_CLEAR_TTL_SECONDS = 2;

/**
 * Flow-space point the agent's cursor sits at. A type alias so it satisfies
 * Liveblocks' `JsonObject` constraint when published as presence data.
 */
type CursorPosition = {
  x: number;
  y: number;
};

interface PublishOptions {
  /** Flow-space position for the agent's cursor; `null` hides it. */
  cursor?: CursorPosition | null;
}

/**
 * Publishes one AI run's activity into a Liveblocks room, on both channels the
 * room already understands:
 *
 * - **Presence** — the agent appears as a participant with a name, color,
 *   cursor, and `thinking` flag, rendered by the canvas's existing
 *   `LiveCursors` / `PresenceAvatars` components with no extra wiring.
 * - **Feed** — one message per status update in the room's `ai-status-feed`,
 *   so every participant (including someone who joins mid-run) sees the same
 *   progress, and the messages outlive the run.
 *
 * Publishing is best-effort: a failed status update must never take down a run
 * that is otherwise succeeding, so failures are reported to the caller's logger
 * instead of thrown.
 */
export class AiActivityPublisher {
  readonly #roomId: string;
  readonly #runId: string;
  readonly #task: AiTaskKind;
  readonly #onError: (message: string, error: unknown) => void;

  #cursor: CursorPosition | null = null;
  /** Memoized "the feed exists" check; reset on failure so it can retry. */
  #feedReady: Promise<void> | null = null;

  constructor(options: {
    roomId: string;
    runId: string;
    /** Which generator this run belongs to; carried on every feed message. */
    task: AiTaskKind;
    onError: (message: string, error: unknown) => void;
  }) {
    this.#roomId = options.roomId;
    this.#runId = options.runId;
    this.#task = options.task;
    this.#onError = options.onError;
  }

  /**
   * Pushes a status message to the shared feed and refreshes AI presence.
   * `thinking` presence is on for every state except the terminal ones.
   */
  async publish(
    state: AiRunState,
    message: string,
    options: PublishOptions = {},
  ): Promise<void> {
    if (options.cursor !== undefined) {
      this.#cursor = options.cursor;
    }

    const thinking = state === "thinking" || state === "working";

    await Promise.all([
      this.#writeStatus(state, message),
      this.#writePresence(thinking, PRESENCE_TTL_SECONDS),
    ]);
  }

  /**
   * Moves the agent's cursor without adding a feed entry — used while applying
   * canvas changes so collaborators can watch the agent work node by node.
   */
  async moveCursor(cursor: CursorPosition): Promise<void> {
    this.#cursor = cursor;
    await this.#writePresence(true, PRESENCE_TTL_SECONDS);
  }

  /**
   * Clears AI presence when the run finishes. The cursor and thinking flag are
   * reset and the presence record is given a short TTL so the agent stops
   * appearing as a participant a moment later. The status feed is left intact —
   * it is the record of what the run did.
   */
  async clearPresence(): Promise<void> {
    this.#cursor = null;
    await this.#writePresence(false, PRESENCE_CLEAR_TTL_SECONDS);
  }

  async #writeStatus(state: AiRunState, message: string): Promise<void> {
    try {
      await this.#ensureFeed();
      await getLiveblocks().createFeedMessage({
        roomId: this.#roomId,
        feedId: AI_STATUS_FEED_ID,
        // Parsed on the way out as well as on the way in, so a publisher can
        // never put a payload on the feed that readers will discard.
        data: aiStatusMessageSchema.parse({
          task: this.#task,
          state,
          text: message,
          runId: this.#runId,
        }),
      });
    } catch (error) {
      this.#onError("Failed to publish AI status to the room feed", error);
    }
  }

  /**
   * Creates the room's status feed on first use. Messages can only be added to
   * a feed that exists, and a room that has never had an AI run has none — so
   * "create or reuse" is a create whose 409 (already exists) is the reuse.
   */
  #ensureFeed(): Promise<void> {
    this.#feedReady ??= getLiveblocks()
      .createFeed({ roomId: this.#roomId, feedId: AI_STATUS_FEED_ID })
      .then(() => undefined)
      .catch((error: unknown) => {
        if (error instanceof LiveblocksError && error.status === 409) {
          return;
        }

        // Forget the failure so the next status update tries again rather than
        // inheriting a permanently rejected promise.
        this.#feedReady = null;
        throw error;
      });

    return this.#feedReady;
  }

  async #writePresence(thinking: boolean, ttl: number): Promise<void> {
    try {
      await getLiveblocks().setPresence(this.#roomId, {
        userId: AI_AGENT.userId,
        data: { cursor: this.#cursor, thinking },
        userInfo: { name: AI_AGENT.name, color: AI_AGENT.color },
        ttl,
      });
    } catch (error) {
      this.#onError("Failed to publish AI presence", error);
    }
  }
}
