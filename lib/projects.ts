import { prisma } from "@/lib/prisma";
import type { Project, ProjectOwnership } from "@/types/project";

/**
 * A room ID — and therefore a client-supplied project ID — is a slug plus a
 * suffix: lowercase alphanumerics joined by single hyphens. Anything else is
 * rejected so the ID stays URL-safe and aligned with the Liveblocks room.
 */
const PROJECT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Pragmatic email shape check for collaborator invites. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
 * Lists projects shared with any of `emails` via a collaborator record, newest
 * first, mapped to the sidebar's `Project` shape. Accepts the user's full set of
 * verified emails since an invite may target a secondary address. Emails are
 * stored lowercased, so the lookup lowercases its arguments to match.
 */
export async function listSharedProjects(
  emails: string[]
): Promise<Project[]> {
  if (emails.length === 0) {
    return [];
  }

  const projects = await prisma.project.findMany({
    where: {
      collaborators: {
        some: { email: { in: emails.map((email) => email.toLowerCase()) } },
      },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });

  return projects.map((project) => toProject(project, "shared"));
}

/**
 * Returns whether `userId` owns the project. Used to gate collaborator invite
 * and removal, which are owner-only.
 */
export async function isProjectOwner(
  projectId: string,
  userId: string
): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    select: { id: true },
  });

  return project !== null;
}

/**
 * Extracts and normalizes a collaborator `email` from an unvalidated request
 * body: trimmed, lowercased, and shape-checked. Returns `undefined` when absent
 * or not a plausible email.
 */
export function parseCollaboratorEmail(body: unknown): string | undefined {
  if (body && typeof body === "object" && "email" in body) {
    const { email } = body as { email: unknown };
    if (typeof email === "string") {
      const normalized = email.trim().toLowerCase();
      if (EMAIL_PATTERN.test(normalized)) {
        return normalized;
      }
    }
  }

  return undefined;
}

/**
 * Classifies why an owner-scoped mutation (`where: { id, ownerId }`) matched no
 * row. Ownership is enforced atomically by the mutation itself; this only runs
 * on its not-found path to pick the right status: `404` when the project does
 * not exist, `403` when it exists but is owned by someone else.
 */
export async function resolveMutationFailureStatus(
  projectId: string
): Promise<403 | 404> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  return project ? 403 : 404;
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
