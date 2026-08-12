import { z } from "zod";

import { NODE_SHAPES } from "@/types/canvas";
import { chatMessageSchema } from "@/types/tasks";

/**
 * Canvas node fields spec generation actually reads, validated with Zod at the
 * request boundary (`POST /api/ai/spec`) and re-validated at the task boundary
 * (`generate-spec`). `.passthrough()` tolerates the rest of the live
 * `CanvasNode` shape (position, style, type) the client sends along, since
 * spec generation only describes labels, shapes, and connections.
 */
export const specNodeSchema = z
  .object({
    id: z.string().min(1),
    data: z.object({
      label: z.string(),
      shape: z.enum(NODE_SHAPES),
      color: z.string(),
    }),
  })
  .passthrough();

/** Canvas edge fields spec generation actually reads. */
export const specEdgeSchema = z
  .object({
    id: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
    data: z.object({ label: z.string().optional() }).optional(),
  })
  .passthrough();

/**
 * Fields shared by the spec generation request and task payload: the room's
 * chat history and current canvas graph. `roomId` is included here too — the
 * request never carries a `projectId` (it is derived server-side from the
 * access-checked project, see `POST /api/ai/spec`), while the task payload
 * extends this schema with that resolved `projectId`.
 */
export const specCanvasPayloadSchema = z.object({
  roomId: z.string().min(1),
  chatHistory: z.array(chatMessageSchema),
  nodes: z.array(specNodeSchema),
  edges: z.array(specEdgeSchema),
});

export type SpecCanvasPayload = z.infer<typeof specCanvasPayloadSchema>;
