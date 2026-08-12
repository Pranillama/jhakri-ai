"use client"

import { useEffect, useRef } from "react"
import { useRealtimeRun } from "@trigger.dev/react-hooks"

import type { generateSpec } from "@/trigger/generate-spec"

/** How a spec run ended, as the Specs tab should report it. */
export type SpecRunOutcome = { ok: true } | { ok: false; message: string }

/** Used when a failed run carries no usable error message. */
const FAILED_FALLBACK = "Spec generation failed. Please try again."

/**
 * Subscribes to one spec run and reports how it ended. Renders nothing — it
 * exists purely to own the subscription's lifetime.
 *
 * **Mount this with `key={runId}` and unmount it when the run is done** —
 * same reasoning as `DesignRunWatcher`: `useRealtimeRun` keeps "already
 * completed" bookkeeping in instance refs and per-instance SWR entries that
 * don't reset when `runId` changes, so a surviving instance would never fire
 * `onComplete` for a second run.
 *
 * Unlike the design run, a successful spec run has no summary worth showing —
 * the task's output is the generated Markdown itself, and per the specs UI's
 * "do not store spec content in frontend state long-term" rule, the caller
 * doesn't need it: it already knows to just refresh the specs list.
 */
export function SpecRunWatcher({
  runId,
  accessToken,
  onFinish,
}: {
  /** Trigger.dev run ID returned by `POST /api/ai/spec`. */
  runId: string
  /** Public token scoped to that run, from `POST /api/ai/spec/token`. */
  accessToken: string
  /** Called exactly once, when the run reaches a terminal state. */
  onFinish: (outcome: SpecRunOutcome) => void
}) {
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])

  useRealtimeRun<typeof generateSpec>(runId, {
    accessToken,
    onComplete: (run, error) => {
      if (run.isSuccess) {
        onFinishRef.current({ ok: true })
        return
      }

      const message =
        error?.message.trim() || run.error?.message?.trim() || FAILED_FALLBACK

      onFinishRef.current({ ok: false, message })
    },
  })

  return null
}
