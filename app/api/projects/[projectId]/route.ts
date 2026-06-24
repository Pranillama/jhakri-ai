import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { parseProjectName, resolveMutationFailureStatus } from "@/lib/projects";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

/** Builds the 403/404 response for an owner-scoped mutation that matched no row. */
async function mutationNotFoundResponse(projectId: string) {
  const status = await resolveMutationFailureStatus(projectId);
  return NextResponse.json(
    { error: status === 404 ? "Not found" : "Forbidden" },
    { status }
  );
}

/**
 * PATCH /api/projects/[projectId] — rename a project. Ownership is enforced
 * atomically by scoping the update to `{ id, ownerId }`; a non-matching row
 * yields 403 (owned by someone else) or 404 (missing).
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

  try {
    const project = await prisma.project.update({
      where: { id: projectId, ownerId: userId },
      data: { name },
    });

    return NextResponse.json(project);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return mutationNotFoundResponse(projectId);
    }

    throw error;
  }
}

/**
 * DELETE /api/projects/[projectId] — delete a project. Ownership is enforced
 * atomically by scoping the delete to `{ id, ownerId }`; a non-matching row
 * yields 403 (owned by someone else) or 404 (missing).
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  try {
    const project = await prisma.project.delete({
      where: { id: projectId, ownerId: userId },
    });

    return NextResponse.json(project);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return mutationNotFoundResponse(projectId);
    }

    throw error;
  }
}
