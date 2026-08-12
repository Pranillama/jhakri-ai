import { runs, tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import { specCanvasPayloadSchema } from "@/lib/spec-request";
import type { generateSpec } from "@/trigger/generate-spec";

/**
 * POST /api/ai/spec — start a spec generation run. Validates the client's
 * chat history and canvas graph, verifies the caller can access the room's
 * project, triggers the `generate-spec` background task via Trigger.dev,
 * records the run against the user and project in a `TaskRun`, and returns
 * the run ID. No AI work runs in the request handler — that belongs to the
 * background task.
 *
 * `roomId` doubles as the project ID in this app, but it is never trusted as
 * one on its own: `getAccessibleProject` is what proves the caller may
 * actually use it that way, the same rule the design route follows for its
 * client-supplied `projectId`.
 */
export async function POST(request: Request) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }

  const parsed = specCanvasPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "roomId, chatHistory, nodes, and edges are required" },
      { status: 400 }
    );
  }

  const { roomId, chatHistory, nodes, edges } = parsed.data;

  const project = await getAccessibleProject(roomId, identity);
  if (!project) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const handle = await tasks.trigger<typeof generateSpec>("generate-spec", {
      // Derived from the access-checked project, never from client input.
      projectId: project.id,
      roomId,
      chatHistory,
      nodes,
      edges,
    });

    try {
      await prisma.taskRun.create({
        data: {
          runId: handle.id,
          projectId: project.id,
          userId: identity.userId,
        },
      });
    } catch (ownershipError) {
      await runs.cancel(handle.id).catch(() => {});
      throw ownershipError;
    }

    return NextResponse.json({ runId: handle.id });
  } catch {
    return NextResponse.json(
      { error: "Failed to start spec generation" },
      { status: 500 }
    );
  }
}
