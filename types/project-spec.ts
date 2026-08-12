/**
 * One generated spec's metadata, as returned by
 * `GET /api/projects/[projectId]/specs`. The Markdown content is not included
 * here — it is fetched separately, per spec, through the download route.
 */
export interface ProjectSpecSummary {
  id: string;
  /** Display filename, matching what the download route serves it as. */
  filename: string;
  /** ISO 8601 timestamp (JSON-serialized `Date`). */
  createdAt: string;
}
