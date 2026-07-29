/**
 * Identity the AI agent appears under inside a canvas room.
 *
 * The agent publishes ephemeral Liveblocks presence (`cursor` + `thinking`)
 * from its background task via the REST presence API, so it shows up as just
 * another participant and renders through the existing cursor and avatar
 * components with no AI-specific branching.
 *
 * Its *progress messages* travel on the other channel — the shared
 * `ai-status-feed` Liveblocks feed, typed in `types/tasks.ts` — because those
 * need to be durable and identical for everyone, including a mid-run joiner.
 */
export const AI_AGENT = {
  userId: "jhakri-ai-agent",
  name: "Jhakri AI",
  /** The AI accent from `context/ui-context.md` (`--accent-ai`). */
  color: "#6457f9",
} as const;
