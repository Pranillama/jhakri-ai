/**
 * A project as rendered in the editor sidebar / dialogs. `ownership`
 * distinguishes projects the current user owns (which expose rename/delete
 * actions) from projects shared with them.
 */
export interface Project {
  id: string
  name: string
  ownership: ProjectOwnership
}

export type ProjectOwnership = "owned" | "shared"
