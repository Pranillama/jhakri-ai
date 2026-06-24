import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { checkProjectOwnership, parseProjectName } from "@/lib/projects";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

/**
 * PATCH /api/projects/[projectId] — rename a project. Only the owner may rename;
 * non-owner attempts return 403 and missing projects return 404.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const name = parseProjectName(body);

  if (!name) {
    return NextResponse.json(
      { error: "Project name is required" },
      { status: 400 }
    );
  }

  const ownership = await checkProjectOwnership(projectId, userId);

  if (!ownership.ok) {
    return NextResponse.json(
      { error: ownership.status === 404 ? "Not found" : "Forbidden" },
      { status: ownership.status }
    );
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { name },
  });

  return NextResponse.json(project);
}

/**
 * DELETE /api/projects/[projectId] — delete a project. Only the owner may
 * delete; non-owner attempts return 403 and missing projects return 404.
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const ownership = await checkProjectOwnership(projectId, userId);

  if (!ownership.ok) {
    return NextResponse.json(
      { error: ownership.status === 404 ? "Not found" : "Forbidden" },
      { status: ownership.status }
    );
  }

  const project = await prisma.project.delete({
    where: { id: projectId },
  });

  return NextResponse.json(project);
}
