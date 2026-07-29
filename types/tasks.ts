import { z } from "zod";

/**
 * Payload contract for the shared AI status feed.
 *
 * Background tasks (Trigger.dev) publish their progress into a Liveblocks feed
 * named `ai-status-feed`, one message per status update. Every participant in
 * the room subscribes to that feed, so AI activity is shared state rather than
 * something each client tracks on its own — someone who joins mid-run sees the
 * same message as everyone else.
 *
 * The schema is deliberately task-agnostic: `task` names which generator the
 * message came from, so spec generation can publish into the same feed later
 * without a second channel or a second payload shape.
 */

/** Feed ID carrying AI activity for a canvas room. One feed per room. */
export const AI_STATUS_FEED_ID = "ai-status-feed";

/** Background generators that publish into the feed. */
export const AI_TASK_KINDS = ["design", "spec"] as const;

/** Lifecycle state of a run, as seen by everyone in the room. */
export const AI_RUN_STATES = [
  "thinking",
  "working",
  "complete",
  "error",
] as const;

export type AiTaskKind = (typeof AI_TASK_KINDS)[number];
export type AiRunState = (typeof AI_RUN_STATES)[number];

/**
 * Data carried by one `ai-status-feed` message. `text` is optional — a message
 * is meaningful from its `state` alone, and consumers fall back to the wording
 * in `aiStatusText` when a publisher has nothing specific to say.
 */
export const aiStatusMessageSchema = z.object({
  /** Which generator published this message. */
  task: z.enum(AI_TASK_KINDS),
  /** Where the run is in its lifecycle. */
  state: z.enum(AI_RUN_STATES),
  /** Human-readable status line. */
  text: z.string().optional(),
  /** Trigger.dev run ID this message belongs to. */
  runId: z.string().min(1),
});

export type AiStatusMessage = z.infer<typeof aiStatusMessageSchema>;

/**
 * Validates one feed message's data. Feed payloads are untrusted input on the
 * read side — an older or newer publisher, or a message written by anything
 * else, must never reach the UI — so consumers parse before displaying and skip
 * anything that fails.
 */
export function parseAiStatusMessage(data: unknown): AiStatusMessage | null {
  const result = aiStatusMessageSchema.safeParse(data);
  return result.success ? result.data : null;
}

/** Whether a run in this state is still in progress. */
export function isActiveRunState(state: AiRunState): boolean {
  return state === "thinking" || state === "working";
}

/** Wording used when a message carries no `text` of its own. */
const FALLBACK_TEXT: Record<AiRunState, string> = {
  thinking: "Thinking…",
  working: "Working…",
  complete: "Done",
  error: "Something went wrong",
};

/** Resolves the line to display for a status message. */
export function aiStatusText(message: AiStatusMessage): string {
  return message.text?.trim() || FALLBACK_TEXT[message.state];
}

/**
 * Payload contract for the room's collaborative chat feed.
 *
 * `ai-chat` carries the room's conversation: prompts typed into the sidebar
 * composer (`role: "user"`) and the design agent's closing replies (`role:
 * "assistant"`), told apart by `role`. It is deliberately separate from
 * `ai-status-feed`, which carries a run's in-flight lifecycle — mixing the two
 * would make either payload ambiguous to validate, and mid-run progress is not
 * something the conversation should accumulate.
 */

/** Feed ID carrying collaborative chat for a canvas room. One feed per room. */
export const AI_CHAT_FEED_ID = "ai-chat";

/** Who a chat message is attributed to. */
export const CHAT_MESSAGE_ROLES = ["user", "assistant"] as const;

export type ChatMessageRole = (typeof CHAT_MESSAGE_ROLES)[number];

/** Data carried by one `ai-chat` feed message. */
export const chatMessageSchema = z.object({
  /** Display name of the participant who sent the message. */
  sender: z.string().min(1),
  /** Who the message is attributed to. */
  role: z.enum(CHAT_MESSAGE_ROLES),
  /** The message text. */
  content: z.string().min(1),
  /** Epoch milliseconds the message was sent. */
  timestamp: z.number(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

/**
 * Validates one `ai-chat` feed message's data. Feed payloads are untrusted on
 * the read side, same as the status feed — a message from an older publisher,
 * or written by anything else, must never reach the UI.
 */
export function parseChatMessage(data: unknown): ChatMessage | null {
  const result = chatMessageSchema.safeParse(data);
  return result.success ? result.data : null;
}
