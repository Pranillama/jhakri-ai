import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import { specFilename } from "@/lib/spec-model";

interface RouteContext {
  params: Promise<{ projectId: string; specId: string }>;
}

/**
 * GET /api/projects/[projectId]/specs/[specId]/download — download a
 * generated spec's Markdown content. Any project member (owner or
 * collaborator) may download, matching who can view the collaborative canvas
 * the spec was generated from. The spec's content is a private Vercel Blob;
 * this route (after the access and ownership checks below) is the only path
 * to it, mirroring the canvas GET route's private-blob handling.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, specId } = await params;

  const project = await getAccessibleProject(projectId, identity);
  if (!project) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Scoped to `projectId` too, not just `specId` — a spec belonging to a
  // different (even accessible) project must never be reachable through this
  // URL.
  const spec = await prisma.projectSpec.findFirst({
    where: { id: specId, projectId },
    select: { filePath: true },
  });

  if (!spec) {
    return NextResponse.json({ error: "Spec not found" }, { status: 404 });
  }

  let blob: Awaited<ReturnType<typeof get>> | null;
  try {
    // `get` returns null for a missing blob, but throws for everything else
    // (auth/config/network failures) — only the former is a 404.
    blob = await get(spec.filePath, { access: "private" });
  } catch (error) {
    console.error("Failed to fetch spec blob", error);
    return NextResponse.json({ error: "Could not download spec" }, { status: 500 });
  }

  if (!blob?.stream) {
    return NextResponse.json({ error: "Spec not found" }, { status: 404 });
  }

  return new NextResponse(blob.stream, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${specFilename(specId)}"`,
    },
  });
}
