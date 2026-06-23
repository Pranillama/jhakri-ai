/**
 * A project in the editor sidebar / dialogs. Mock-only for now — no persistence
 * layer exists yet. `ownership` distinguishes projects the current user owns
 * (which expose rename/delete actions) from projects shared with them.
 */
export interface Project {
  id: string
  name: string
  slug: string
  ownership: ProjectOwnership
}

export type ProjectOwnership = "owned" | "shared"
