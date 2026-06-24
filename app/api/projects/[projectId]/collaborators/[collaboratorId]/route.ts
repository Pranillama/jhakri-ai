import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isProjectOwner } from "@/lib/projects";

interface RouteContext {
  params: Promise<{ projectId: string; collaboratorId: string }>;
}

/**
 * DELETE /api/projects/[projectId]/collaborators/[collaboratorId] — remove a
 * collaborator. Owner-only. The delete is scoped to the project so a
 * collaborator ID from another project cannot be removed here.
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, collaboratorId } = await params;

  if (!(await isProjectOwner(projectId, userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.projectCollaborator.delete({
      where: { id: collaboratorId, projectId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    throw error;
  }
}
