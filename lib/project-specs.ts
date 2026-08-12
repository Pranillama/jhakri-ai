/**
 * Client-side fetch helpers for a project's generated specs. The list route
 * returns metadata only; a spec's Markdown content is fetched separately, per
 * spec ID, through the same download route the Download action uses — never
 * read directly from Blob on the client.
 */

import type { ProjectSpecSummary } from "@/types/project-spec";

/**
 * Pulls the API's `{ error }` message off a failed response, falling back
 * when the body isn't usable. Mirrors `lib/ai-design-run.ts`'s helper.
 */
async function readErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  const body: unknown = await response.json().catch(() => null);

  if (body && typeof body === "object" && "error" in body) {
    const { error } = body as { error?: unknown };
    if (typeof error === "string" && error.trim()) {
      return error.trim();
    }
  }

  return fallback;
}

/** The download route's URL for one spec — also used to fetch its content. */
export function specDownloadUrl(projectId: string, specId: string): string {
  return `/api/projects/${projectId}/specs/${specId}/download`;
}

/** Lists a project's generated specs, newest first. */
export async function fetchProjectSpecs(
  projectId: string
): Promise<ProjectSpecSummary[]> {
  const response = await fetch(`/api/projects/${projectId}/specs`);

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Could not load specs.")
    );
  }

  const data = (await response.json()) as { specs?: ProjectSpecSummary[] };
  return data.specs ?? [];
}

/** Fetches one spec's raw Markdown content, for preview. */
export async function fetchSpecContent(
  projectId: string,
  specId: string
): Promise<string> {
  const response = await fetch(specDownloadUrl(projectId, specId));

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Could not load the spec.")
    );
  }

  return response.text();
}
