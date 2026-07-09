import { get, put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
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
 * PUT /api/projects/[projectId]/canvas — save the current canvas graph. Any
 * project member (owner or collaborator) may save, matching who can edit the
 * collaborative canvas. The graph is uploaded to Vercel Blob at a stable,
 * private path (`canvas/{projectId}.json`, overwritten on every save) and the
 * returned URL is stored on the Prisma project record.
 */
export async function PUT(request: Request, { params }: RouteContext) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await getAccessibleProject(projectId, identity);
  if (!project) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }

  const payload = parseCanvasPayload(body);
  if (!payload) {
    return NextResponse.json(
      { error: "nodes and edges arrays are required" },
      { status: 400 }
    );
  }

  const blob = await put(
    `canvas/${projectId}.json`,
    JSON.stringify(payload),
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

  const project = await getAccessibleProject(projectId, identity);
  if (!project) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const record = await prisma.project.findUnique({
    where: { id: projectId },
    select: { canvasJsonPath: true },
  });

  if (!record?.canvasJsonPath) {
    return NextResponse.json({ nodes: [], edges: [] });
  }

  const blob = await get(record.canvasJsonPath, { access: "private" });
  if (!blob?.stream) {
    return NextResponse.json({ nodes: [], edges: [] });
  }

  const saved = parseCanvasPayload(await new Response(blob.stream).json());
  return NextResponse.json(saved ?? { nodes: [], edges: [] });
}
