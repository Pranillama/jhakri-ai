import { prisma } from "@/lib/prisma";
import type { Project, ProjectOwnership } from "@/types/project";

/**
 * A room ID — and therefore a client-supplied project ID — is a slug plus a
 * suffix: lowercase alphanumerics joined by single hyphens. Anything else is
 * rejected so the ID stays URL-safe and aligned with the Liveblocks room.
 */
const PROJECT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Shape selected from the DB for the sidebar lists. */
interface ProjectRecord {
  id: string;
  name: string;
}

function toProject(
  record: ProjectRecord,
  ownership: ProjectOwnership
): Project {
  return { id: record.id, name: record.name, ownership };
}

/**
 * Lists projects owned by `userId`, newest first, mapped to the sidebar's
 * `Project` shape. Used by the editor home server component.
 */
export async function listOwnedProjects(userId: string): Promise<Project[]> {
  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });

  return projects.map((project) => toProject(project, "owned"));
}

/**
 * Lists projects shared with `email` via a collaborator record, newest first,
 * mapped to the sidebar's `Project` shape.
 */
export async function listSharedProjects(email: string): Promise<Project[]> {
  const projects = await prisma.project.findMany({
    where: { collaborators: { some: { email } } },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });

  return projects.map((project) => toProject(project, "shared"));
}

/**
 * Result of verifying that a user may mutate a project. `404` distinguishes a
 * missing project from `403`, which signals an existing project owned by
 * someone else.
 */
export type ProjectOwnershipResult =
  | { ok: true }
  | { ok: false; status: 403 | 404 };

/**
 * Confirms `userId` owns the project. Only the owner may rename or delete a
 * project, per the auth model in `architecture-context.md`.
 */
export async function checkProjectOwnership(
  projectId: string,
  userId: string
): Promise<ProjectOwnershipResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (!project) {
    return { ok: false, status: 404 };
  }

  if (project.ownerId !== userId) {
    return { ok: false, status: 403 };
  }

  return { ok: true };
}

/**
 * Extracts a trimmed `name` field from an unvalidated request body. Returns
 * `undefined` when the field is absent or not a string.
 */
export function parseProjectName(body: unknown): string | undefined {
  if (body && typeof body === "object" && "name" in body) {
    const { name } = body as { name: unknown };
    if (typeof name === "string") {
      return name.trim();
    }
  }

  return undefined;
}

/**
 * Extracts a client-supplied project `id` from an unvalidated request body. The
 * create flow sends the generated Liveblocks room ID here so the project ID and
 * room ID stay aligned. Returns `undefined` when absent or not a valid room ID,
 * in which case the schema's cuid default is used instead.
 */
export function parseProjectId(body: unknown): string | undefined {
  if (body && typeof body === "object" && "id" in body) {
    const { id } = body as { id: unknown };
    if (typeof id === "string") {
      const trimmed = id.trim();
      if (PROJECT_ID_PATTERN.test(trimmed)) {
        return trimmed;
      }
    }
  }

  return undefined;
}
