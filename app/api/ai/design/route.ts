import { runs, tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import type { designAgent } from "@/trigger/design-agent";

/**
 * Validated request body for a design generation trigger: the user's design
 * prompt plus the project the run is scoped to. The room the agent operates on
 * is never taken from the client — it is derived from the access-checked
 * project below, so a caller can't point the agent at a room outside a
 * project they were actually authorized for.
 */
interface DesignRequest {
  prompt: string;
  projectId: string;
}

/** Structural check only — matches this codebase's boundary-validation style. */
function parseDesignRequest(body: unknown): DesignRequest | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const { prompt, projectId } = body as {
    prompt?: unknown;
    projectId?: unknown;
  };

  if (typeof prompt !== "string" || typeof projectId !== "string") {
    return undefined;
  }

  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt || !projectId) {
    return undefined;
  }

  return { prompt: trimmedPrompt, projectId };
}

/**
 * POST /api/ai/design — start a design generation run. Validates the prompt and
 * project context, verifies the caller can access the project, triggers the
 * `design-agent` background task via Trigger.dev, records the run against the
 * user and project in a `TaskRun`, and returns the run ID. No AI work runs in
 * the request handler — that belongs to the background task.
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

  const payload = parseDesignRequest(body);
  if (!payload) {
    return NextResponse.json(
      { error: "prompt, roomId, and projectId are required" },
      { status: 400 }
    );
  }

  const project = await getAccessibleProject(payload.projectId, identity);
  if (!project) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const handle = await tasks.trigger<typeof designAgent>("design-agent", {
      prompt: payload.prompt,
      // The room ID is the project ID (see architecture context); derive it
      // from the access-checked `project`, never from client input, so the
      // agent can never be pointed at a room outside the authorized project.
      roomId: project.id,
    });

    try {
      await prisma.taskRun.create({
        data: {
          runId: handle.id,
          projectId: payload.projectId,
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
      { error: "Failed to start design generation" },
      { status: 500 }
    );
  }
}
