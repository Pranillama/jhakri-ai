import { NextResponse } from "next/server";

import { Prisma } from "@/app/generated/prisma/client";
import { listProjectMembers, toCollaboratorMember } from "@/lib/collaborators";
import { prisma } from "@/lib/prisma";
import {
  getAccessibleProject,
  getCurrentIdentity,
} from "@/lib/project-access";
import {
  parseCollaboratorEmail,
  resolveMutationFailureStatus,
} from "@/lib/projects";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[projectId]/collaborators — list everyone with access (owner
 * first, then collaborators), enriched with Clerk profile data. Any project
 * member (owner or collaborator) may read the list.
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

  const members = await listProjectMembers(projectId);
  return NextResponse.json({ members });
}

/**
 * POST /api/projects/[projectId]/collaborators — invite a collaborator by
 * email. Owner-only. Returns the created (Clerk-enriched) collaborator.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const email = parseCollaboratorEmail(body);
  if (!email) {
    return NextResponse.json(
      { error: "A valid email is required" },
      { status: 400 }
    );
  }

  if (identity.emails.includes(email)) {
    return NextResponse.json(
      { error: "You already own this project" },
      { status: 400 }
    );
  }

  try {
    // Ownership is enforced atomically with the write: the update only matches a
    // project owned by the requester, and the nested create inserts the
    // collaborator in the same statement — no TOCTOU window to a separate check.
    const { collaborators } = await prisma.project.update({
      where: { id: projectId, ownerId: identity.userId },
      data: { collaborators: { create: { email } } },
      select: {
        collaborators: { where: { email }, select: { id: true, email: true } },
      },
    });

    const member = await toCollaboratorMember(collaborators[0]);
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // The [projectId, email] unique constraint rejects a duplicate invite.
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "That person is already a collaborator" },
          { status: 409 }
        );
      }

      // The owner-scoped update matched no row: project missing (404) or owned
      // by someone else (403).
      if (error.code === "P2025") {
        const status = await resolveMutationFailureStatus(projectId);
        return NextResponse.json(
          { error: status === 404 ? "Not found" : "Forbidden" },
          { status }
        );
      }
    }

    throw error;
  }
}
