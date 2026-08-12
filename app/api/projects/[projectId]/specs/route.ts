import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import { specFilename } from "@/lib/spec-model";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[projectId]/specs — list the specs generated for a
 * project, newest first. Any project member (owner or collaborator) may list,
 * same access gate as the download route. Metadata only — `filename` is
 * derived (matching what the download route serves the file as), the spec's
 * Markdown content is fetched separately per spec ID via the download route.
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

  const specs = await prisma.projectSpec.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json({
    specs: specs.map((spec) => ({
      id: spec.id,
      filename: specFilename(spec.id),
      createdAt: spec.createdAt,
    })),
  });
}
