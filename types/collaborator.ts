export type AccessRole = "owner" | "collaborator"

/**
 * A person with access to a project, as shown in the share dialog. `name` and
 * `imageUrl` are enriched from Clerk when a user exists (email-only fallback
 * otherwise). `id` is the `ProjectCollaborator` row id used for removal; it is
 * `null` for the owner, who cannot be removed.
 */
export interface AccessMember {
  id: string | null
  email: string
  name: string | null
  imageUrl: string | null
  role: AccessRole
}
