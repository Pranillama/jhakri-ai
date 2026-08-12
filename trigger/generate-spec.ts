import crypto from "node:crypto";

import { del, put } from "@vercel/blob";
import { logger, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import { AiActivityPublisher } from "@/lib/ai-activity";
import { prisma } from "@/lib/prisma";
import { generateSpecMarkdown } from "@/lib/spec-model";
import { specCanvasPayloadSchema } from "@/lib/spec-request";

/**
 * Payload for the spec generation task. `POST /api/ai/spec` validates the
 * request and access-gates it before triggering; this schema re-validates at
 * the task boundary so a malformed payload fails fast instead of reaching the
 * model. `projectId` is the one field the request never carries directly — it
 * is the access-checked project the route resolved from `roomId`.
 */
const generateSpecPayloadSchema = specCanvasPayloadSchema.extend({
  projectId: z.string().min(1),
});

export type GenerateSpecPayload = z.infer<typeof generateSpecPayloadSchema>;

/**
 * AI spec generation agent. Turns the current canvas graph and room chat
 * history into a Markdown technical specification.
 *
 * Unlike the design agent, this task never mutates the canvas — the client
 * sends the exact graph and chat history to describe, so there is nothing to
 * re-read from Liveblocks and nothing that makes a retry unsafe. It relies on
 * the project's default retry policy (`trigger.config.ts`) rather than
 * overriding it to a single attempt.
 *
 * Progress publishes to the same `ai-status-feed` the design agent uses
 * (`task: "spec"`), so the canvas status banner and AI sidebar render both
 * kinds of runs identically. Once generated, the Markdown is uploaded to
 * Vercel Blob and linked to the project through a `ProjectSpec` record —
 * the same metadata + blob split `canvas/route.ts` uses for canvas
 * snapshots. The task's output remains the plain Markdown content itself.
 */
export const generateSpec = schemaTask({
  id: "generate-spec",
  schema: generateSpecPayloadSchema,
  run: async (payload, { ctx, signal }) => {
    const activity = new AiActivityPublisher({
      roomId: payload.roomId,
      runId: ctx.run.id,
      task: "spec",
      onError: (message, error) => logger.warn(message, { error }),
    });

    try {
      await activity.publish("thinking", "Reading the canvas and conversation…");

      const nodes = payload.nodes.map((node) => ({
        id: node.id,
        label: node.data.label,
        shape: node.data.shape,
      }));
      const edges = payload.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        ...(edge.data?.label ? { label: edge.data.label } : {}),
      }));

      await activity.publish("working", "Writing the technical spec…");

      const markdown = await generateSpecMarkdown({
        chatHistory: payload.chatHistory,
        nodes,
        edges,
        signal,
      });

      await activity.publish("working", "Saving the generated spec…");

      // The spec ID is generated up front so the blob path can embed it and
      // the `ProjectSpec` row can be written in one create — no placeholder
      // filePath is ever visible to a reader of the table.
      const specId = crypto.randomUUID();
      const blob = await put(`specs/${payload.projectId}/${specId}.md`, markdown, {
        access: "private",
        contentType: "text/markdown",
        addRandomSuffix: false,
        allowOverwrite: true,
      });

      try {
        await prisma.projectSpec.create({
          data: { id: specId, projectId: payload.projectId, filePath: blob.url },
        });
      } catch (error) {
        // The blob already landed in storage; without this the row creation
        // failing would leave it there forever with nothing pointing at it.
        await del(blob.url).catch((deleteError: unknown) => {
          logger.warn("generate-spec: failed to delete orphaned blob", {
            url: blob.url,
            error: deleteError,
          });
        });
        throw error;
      }

      await activity.publish("complete", "Spec generated.");

      logger.info("generate-spec completed", {
        roomId: payload.roomId,
        projectId: payload.projectId,
        specId,
        nodes: nodes.length,
        edges: edges.length,
        length: markdown.length,
      });

      return markdown;
    } catch (error) {
      // The room must never be left showing a run that is silently stuck, so
      // the failure is published before it is rethrown.
      const message = error instanceof Error ? error.message : "Unknown error";

      await activity.publish("error", `Spec generation failed: ${message}`);

      logger.error("generate-spec failed", { roomId: payload.roomId, error });
      throw error;
    } finally {
      // Whatever happened, the agent stops being a participant in the room.
      await activity.clearPresence();
    }
  },
});
