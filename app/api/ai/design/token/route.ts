import { auth as triggerAuth } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentIdentity } from "@/lib/project-access";

/** Extracts a `runId` string from an unvalidated request body. */
function parseRunId(body: unknown): string | undefined {
  if (body && typeof body === "object" && "runId" in body) {
    const { runId } = body as { runId: unknown };
    if (typeof runId === "string" && runId) {
      return runId;
    }
  }

  return undefined;
}

/**
 * POST /api/ai/design/token — issue a Trigger.dev public access token scoped to
 * a single run. Ownership is verified against the `TaskRun` record (the run must
 * belong to the caller) before any token is created, so a token only ever reads
 * a run the user actually started. Used by the client to subscribe to run
 * updates in realtime.
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

  const runId = parseRunId(body);
  if (!runId) {
    return NextResponse.json({ error: "runId is required" }, { status: 400 });
  }

  const taskRun = await prisma.taskRun.findUnique({
    where: { runId },
    select: { userId: true },
  });

  if (!taskRun || taskRun.userId !== identity.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = await triggerAuth.createPublicToken({
    scopes: { read: { runs: [runId] } },
  });

  return NextResponse.json({ token });
}
