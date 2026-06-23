/**
 * Derive a URL-safe slug from a free-form project name. Used for the live slug
 * preview in the Create Project dialog.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
