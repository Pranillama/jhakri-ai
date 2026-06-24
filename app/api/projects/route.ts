import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { parseProjectId, parseProjectName } from "@/lib/projects";

const DEFAULT_PROJECT_NAME = "Untitled Project";

/**
 * GET /api/projects — list the authenticated user's projects, newest first.
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(projects);
}

/**
 * POST /api/projects — create a project owned by the authenticated user. A
 * missing or blank name defaults to "Untitled Project". The client sends the
 * generated Liveblocks room ID as `id` so the project ID and room ID stay
 * aligned; a missing or invalid id falls back to the schema's cuid default.
 */
export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const name = parseProjectName(body) || DEFAULT_PROJECT_NAME;
  const id = parseProjectId(body);

  try {
    const project = await prisma.project.create({
      data: { ownerId: userId, name, ...(id ? { id } : {}) },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    // A client-supplied id (the room ID) can collide on a duplicated/retried
    // POST — surface that as a 409 rather than an opaque 500.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A project with that id already exists" },
        { status: 409 }
      );
    }

    throw error;
  }
}
