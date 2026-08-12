import { get, put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { readCanvasSnapshot } from "@/lib/design-canvas";
import { prisma } from "@/lib/prisma";
import {
  getAccessibleProject,
  getAccessibleProjectCanvasPath,
  getCurrentIdentity,
} from "@/lib/project-access";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

interface CanvasPayload {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

/** Structural check only — matches this codebase's boundary-validation style. */
function parseCanvasPayload(body: unknown): CanvasPayload | undefined {
  if (
    body &&
    typeof body === "object" &&
    Array.isArray((body as { nodes?: unknown }).nodes) &&
    Array.isArray((body as { edges?: unknown }).edges)
  ) {
    const { nodes, edges } = body as CanvasPayload;
    return { nodes, edges };
  }

  return undefined;
}

/**
 * PUT /api/projects/[projectId]/canvas — snapshot the room's current
 * Liveblocks Storage and persist it. Any project member (owner or
 * collaborator) may save, matching who can edit the collaborative canvas.
 *
 * Takes no request body: the graph is read directly from Storage server-side
 * via `readCanvasSnapshot` rather than trusted from the client. Storage is
 * already the converged, authoritative state for everyone in the room — a
 * client-supplied graph would just be that one browser's local copy of it,
 * which can lag (network jitter, a backgrounded tab) right at the moment its
 * debounced autosave fires. Reading Storage directly removes that "which
 * client's stale snapshot wins" race entirely: every save persists the same
 * source of truth, just possibly at a slightly different instant.
 *
 * The graph is uploaded to Vercel Blob at a stable, private path
 * (`canvas/{projectId}.json`, overwritten on every save) and the returned URL
 * is stored on the Prisma project record.
 */
export async function PUT(_request: Request, { params }: RouteContext) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await getAccessibleProject(projectId, identity);
  if (!project) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // `roomId` and `projectId` are the same identifier in this app (see the
    // Architecture Decisions entry in progress-tracker.md).
    const snapshot = await readCanvasSnapshot(projectId);

    const blob = await put(
      `canvas/${projectId}.json`,
      JSON.stringify(snapshot),
      {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      }
    );

    await prisma.project.update({
      where: { id: projectId },
      data: { canvasJsonPath: blob.url },
    });

    return NextResponse.json({ url: blob.url });
  } catch {
    return NextResponse.json(
      { error: "Failed to save canvas" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[projectId]/canvas — load the saved canvas graph from
 * Vercel Blob via the project's stored URL. Returns an empty graph (200) when
 * nothing has been saved yet, so the editor can treat "no save" the same as
 * "empty save".
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const record = await getAccessibleProjectCanvasPath(projectId, identity);
  if (!record) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!record.canvasJsonPath) {
    return NextResponse.json({ nodes: [], edges: [] });
  }

  // A missing or corrupted blob (deleted underneath us, transient store
  // error, or non-JSON content) is treated the same as "nothing saved": the
  // load path can't throw a 500, matching the empty-graph contract above.
  try {
    const blob = await get(record.canvasJsonPath, { access: "private" });
    if (!blob?.stream) {
      return NextResponse.json({ nodes: [], edges: [] });
    }

    const saved = parseCanvasPayload(await new Response(blob.stream).json());
    return NextResponse.json(saved ?? { nodes: [], edges: [] });
  } catch {
    return NextResponse.json({ nodes: [], edges: [] });
  }
}
