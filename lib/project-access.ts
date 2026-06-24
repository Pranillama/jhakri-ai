import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import type { ProjectOwnership } from "@/types/project";

/**
 * The signed-in Clerk identity used for project access checks: the user ID plus
 * every verified email on the account (lowercased). Collaborator membership is
 * stored against the invited email, which may be a secondary address, so access
 * must consider all of them — not just the primary. The list can be empty.
 */
export interface CurrentIdentity {
  userId: string;
  emails: string[];
}

/** A project the current user is allowed to open, with how they have access. */
export interface AccessibleProject {
  id: string;
  name: string;
  ownership: ProjectOwnership;
}

/**
 * Resolves the current Clerk identity for server components and access checks.
 * Returns `null` when the request is unauthenticated, so callers can redirect to
 * sign-in.
 */
export async function getCurrentIdentity(): Promise<CurrentIdentity | null> {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const user = await currentUser();

  // Collaborator emails are stored lowercased; normalize here so membership
  // checks match regardless of how Clerk reports the address casing. The primary
  // is always included (Clerk keeps it verified); secondary addresses count only
  // once verified so an unverified email can't be used to claim an invite.
  const emails = new Set<string>();
  const primary = user?.primaryEmailAddress?.emailAddress;
  if (primary) {
    emails.add(primary.toLowerCase());
  }
  for (const address of user?.emailAddresses ?? []) {
    if (address.verification?.status === "verified") {
      emails.add(address.emailAddress.toLowerCase());
    }
  }

  return { userId, emails: [...emails] };
}

/**
 * Loads a project the given identity may open, by ownership or collaborator
 * membership. Returns `null` when the project does not exist or the user has no
 * access — callers render `AccessDenied` for both cases.
 */
export async function getAccessibleProject(
  projectId: string,
  identity: CurrentIdentity
): Promise<AccessibleProject | null> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: identity.userId },
        ...(identity.emails.length > 0
          ? [{ collaborators: { some: { email: { in: identity.emails } } } }]
          : []),
      ],
    },
    select: { id: true, name: true, ownerId: true },
  });

  if (!project) {
    return null;
  }

  return {
    id: project.id,
    name: project.name,
    ownership: project.ownerId === identity.userId ? "owned" : "shared",
  };
}
