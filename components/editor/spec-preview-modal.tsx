"use client"

import { useEffect, useState } from "react"
import { Download, Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"

import { EditorDialog } from "@/components/editor/editor-dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { fetchSpecContent, specDownloadUrl } from "@/lib/project-specs"
import type { ProjectSpecSummary } from "@/types/project-spec"

/** Tailwind classes styling raw `react-markdown` output with project tokens. */
const MARKDOWN_CLASSES =
  "flex flex-col gap-3 text-sm leading-relaxed text-copy-secondary " +
  "[&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-copy-primary " +
  "[&_h2]:mt-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-copy-primary " +
  "[&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-copy-primary " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_a]:text-brand [&_a]:underline [&_strong]:font-medium [&_strong]:text-copy-primary " +
  "[&_code]:rounded [&_code]:bg-subtle [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:text-ai-text " +
  "[&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-subtle [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0"

function formatSpecDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

interface SpecPreviewModalProps {
  /** Liveblocks room ID, doubling as the project ID (see architecture context). */
  projectId: string
  /** The spec being previewed, or `null` when the modal is closed. */
  spec: ProjectSpecSummary | null
  onOpenChange: (open: boolean) => void
}

/**
 * Preview modal for one generated spec. Content is fetched through the same
 * download route the Download action uses (never read directly from Blob on
 * the client) and is discarded once the modal closes rather than cached, per
 * the spec's "do not store spec content in frontend state long-term" limit.
 * Escape-to-close and focus trapping come from the underlying Radix Dialog.
 */
export function SpecPreviewModal({
  projectId,
  spec,
  onOpenChange,
}: SpecPreviewModalProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function sync() {
      if (!spec) {
        setContent(null)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const text = await fetchSpecContent(projectId, spec.id)
        if (active) setContent(text)
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Could not load the spec.")
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void sync()

    return () => {
      active = false
    }
  }, [projectId, spec])

  return (
    <EditorDialog
      open={spec !== null}
      onOpenChange={onOpenChange}
      title={spec?.filename ?? "Spec"}
      description={spec ? `Generated ${formatSpecDate(spec.createdAt)}` : undefined}
      className="sm:max-w-2xl"
      footer={
        spec ? (
          <Button asChild variant="outline" className="gap-1.5">
            <a
              href={specDownloadUrl(projectId, spec.id)}
              aria-label={`Download ${spec.filename}`}
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          </Button>
        ) : null
      }
    >
      <ScrollArea className="max-h-[60vh]">
        <div className="pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-copy-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : error ? (
            <p className="py-4 text-sm text-error">{error}</p>
          ) : (
            <div className={MARKDOWN_CLASSES}>
              <ReactMarkdown>{content ?? ""}</ReactMarkdown>
            </div>
          )}
        </div>
      </ScrollArea>
    </EditorDialog>
  )
}
