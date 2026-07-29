import { logger, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import { AiActivityPublisher } from "@/lib/ai-activity";
import { flattenDesignPlan } from "@/lib/design-actions";
import { applyDesignActions, readCanvasSnapshot } from "@/lib/design-canvas";
import { generateDesignPlan } from "@/lib/design-model";
import type { DesignChangeCounts } from "@/lib/design-canvas";

const designAgentPayloadSchema = z.object({
  /** The user's plain-English design request. */
  prompt: z.string().trim().min(1),
  /** Liveblocks room ID — equal to the project ID. */
  roomId: z.string().min(1),
});

/**
 * Payload for the design generation task. `POST /api/ai/design` validates and
 * access-gates the request before triggering; the schema below re-validates at
 * the task boundary so a malformed payload fails fast instead of reaching the
 * model.
 */
export type DesignAgentPayload = z.infer<typeof designAgentPayloadSchema>;

/** Turns the change counts into a sentence for the closing status message. */
function describeChanges(counts: DesignChangeCounts): string {
  const parts = [
    counts.nodesAdded && `${counts.nodesAdded} node(s) added`,
    counts.nodesUpdated && `${counts.nodesUpdated} node(s) updated`,
    counts.nodesRemoved && `${counts.nodesRemoved} node(s) removed`,
    counts.edgesAdded && `${counts.edgesAdded} connection(s) added`,
    counts.edgesRemoved && `${counts.edgesRemoved} connection(s) removed`,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(", ") : "no changes needed";
}

/**
 * AI design agent. Turns a plain-English prompt into real edits on the shared
 * canvas, while showing its work to everyone in the room.
 *
 * The run reads the current graph, asks Gemini for a plan, validates that plan
 * against the live canvas, and applies it through the collaborative flow — so
 * changes arrive for every participant the same way a human collaborator's
 * edits do. Progress is published on two Liveblocks channels throughout: the
 * agent's own presence (cursor + thinking state) and the room's shared
 * `ai-status-feed`.
 *
 * `maxAttempts: 1` is deliberate. Applying a plan is not idempotent across
 * attempts — a retry would ask the model again, get different node IDs, and
 * stack a second copy of the design on top of a half-applied first one.
 * Transient provider failures are absorbed inside the model call instead (see
 * `MODEL_MAX_RETRIES` in `lib/design-model.ts`), and a hard failure surfaces to
 * the room as an error status the user can retry from.
 */
export const designAgent = schemaTask({
  id: "design-agent",
  schema: designAgentPayloadSchema,
  retry: { maxAttempts: 1 },
  run: async (payload, { ctx, signal }) => {
    const activity = new AiActivityPublisher({
      roomId: payload.roomId,
      runId: ctx.run.id,
      task: "design",
      onError: (message, error) => logger.warn(message, { error }),
    });

    try {
      await activity.publish("thinking", "Reading the canvas…");

      const snapshot = await readCanvasSnapshot(payload.roomId);
      logger.info("design-agent read canvas", {
        roomId: payload.roomId,
        nodes: snapshot.nodes.length,
        edges: snapshot.edges.length,
      });

      await activity.publish("thinking", "Designing your architecture…");

      const plan = await generateDesignPlan({
        prompt: payload.prompt,
        snapshot,
        signal,
      });

      const { actions, skipped } = flattenDesignPlan(plan, snapshot);

      if (skipped.length > 0) {
        logger.warn("design-agent skipped invalid changes", { skipped });
      }

      if (actions.length === 0) {
        await activity.publish("complete", plan.summary.trim() || "No changes needed.");
        return {
          summary: plan.summary,
          applied: 0,
          skipped: skipped.length,
          counts: null,
        };
      }

      await activity.publish(
        "working",
        `Updating the canvas — ${actions.length} change(s)…`,
      );

      const counts = await applyDesignActions({
        roomId: payload.roomId,
        snapshot,
        actions,
        onProgress: async (_action, focus) => {
          if (focus) {
            await activity.moveCursor(focus);
          }
        },
      });

      const summary = plan.summary.trim();
      await activity.publish(
        "complete",
        summary ? `${summary} (${describeChanges(counts)})` : describeChanges(counts),
        { cursor: null },
      );

      logger.info("design-agent applied plan", {
        roomId: payload.roomId,
        applied: actions.length,
        skipped: skipped.length,
        ...counts,
      });

      return {
        summary: plan.summary,
        applied: actions.length,
        skipped: skipped.length,
        counts,
      };
    } catch (error) {
      // The room must never be left showing a run that is silently stuck, so
      // the failure is published before it is rethrown.
      const message =
        error instanceof Error ? error.message : "Unknown error";

      await activity.publish("error", `Design generation failed: ${message}`, {
        cursor: null,
      });

      logger.error("design-agent failed", { roomId: payload.roomId, error });
      throw error;
    } finally {
      // Whatever happened, the agent stops being a participant in the room.
      await activity.clearPresence();
    }
  },
});
