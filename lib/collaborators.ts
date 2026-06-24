import { clerkClient } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import type { AccessMember } from "@/types/collaborator";

/** Clerk caps a single user-list query at 500 results. */
const CLERK_LIST_LIMIT = 500;

interface ClerkProfile {
  name: string | null;
  imageUrl: string | null;
}

/**
 * Looks up Clerk users for the given emails and returns a map keyed by
 * lowercased email. Emails without a Clerk user are simply absent from the map,
 * so callers fall back to showing the email only. A failed Clerk call degrades
 * to an empty map rather than throwing — enrichment is best-effort.
 */
async function enrichEmails(
  emails: string[]
): Promise<Map<string, ClerkProfile>> {
  const profiles = new Map<string, ClerkProfile>();
  // Lowercase up front so the lookup, the `requested` set, and the map keys all
  // agree regardless of how callers cased the input.
  const unique = [...new Set(emails.map((email) => email.toLowerCase()))];
  if (unique.length === 0) {
    return profiles;
  }

  try {
    const client = await clerkClient();
    const { data } = await client.users.getUserList({
      emailAddress: unique,
      limit: Math.min(unique.length, CLERK_LIST_LIMIT),
    });

    const requested = new Set(unique);
    for (const user of data) {
      for (const address of user.emailAddresses) {
        const lower = address.emailAddress.toLowerCase();
        if (requested.has(lower)) {
          profiles.set(lower, {
            name: user.fullName || null,
            imageUrl: user.imageUrl || null,
          });
        }
      }
    }
  } catch {
    // Best-effort enrichment — fall back to email-only on any Clerk failure.
    return new Map();
  }

  return profiles;
}

/**
 * Builds the owner member for a project from its Clerk user ID. Falls back to an
 * email-less "owner" entry if the Clerk lookup fails — the owner is always shown.
 */
async function getOwnerMember(ownerId: string): Promise<AccessMember> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(ownerId);
    return {
      id: null,
      email: user.primaryEmailAddress?.emailAddress ?? "",
      name: user.fullName || null,
      imageUrl: user.imageUrl || null,
      role: "owner",
    };
  } catch {
    return { id: null, email: "", name: null, imageUrl: null, role: "owner" };
  }
}

/**
 * Lists everyone with access to a project — the owner first, then collaborators
 * oldest-first — each enriched with Clerk display name and avatar where
 * available.
 */
export async function listProjectMembers(
  projectId: string
): Promise<AccessMember[]> {
  const [project, rows] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    }),
    prisma.projectCollaborator.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true },
    }),
  ]);

  const members: AccessMember[] = [];

  if (project) {
    members.push(await getOwnerMember(project.ownerId));
  }

  const profiles = await enrichEmails(rows.map((row) => row.email));
  for (const row of rows) {
    const profile = profiles.get(row.email);
    members.push({
      id: row.id,
      email: row.email,
      name: profile?.name ?? null,
      imageUrl: profile?.imageUrl ?? null,
      role: "collaborator",
    });
  }

  return members;
}

/**
 * Enriches a single freshly created collaborator row with Clerk profile data.
 * Used to return the new member from the invite endpoint.
 */
export async function toCollaboratorMember(row: {
  id: string;
  email: string;
}): Promise<AccessMember> {
  const profiles = await enrichEmails([row.email]);
  const profile = profiles.get(row.email);
  return {
    id: row.id,
    email: row.email,
    name: profile?.name ?? null,
    imageUrl: profile?.imageUrl ?? null,
    role: "collaborator",
  };
}
