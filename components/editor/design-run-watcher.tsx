"use client"

import { useEffect, useRef } from "react"
import { useRealtimeRun } from "@trigger.dev/react-hooks"

import type { designAgent } from "@/trigger/design-agent"

/** How a design run ended, as the chat feed should report it. */
export type DesignRunOutcome =
  | { ok: true; summary: string }
  | { ok: false; message: string }

interface DesignRunWatcherProps {
  /** Trigger.dev run ID returned by `POST /api/ai/design`. */
  runId: string
  /** Public token scoped to that run, from `POST /api/ai/design/token`. */
  accessToken: string
  /** Called exactly once, when the run reaches a terminal state. */
  onFinish: (outcome: DesignRunOutcome) => void
}

/** Used when a successful run has no summary of its own to report. */
const COMPLETED_FALLBACK = "I've updated the canvas."

/** Used when a failed run carries no usable error message. */
const FAILED_FALLBACK = "The design run failed. Please try again."

/**
 * Subscribes to one design run and reports how it ended. Renders nothing — it
 * exists purely to own the subscription's lifetime.
 *
 * **Mount this with `key={runId}` and unmount it when the run is done.**
 * `useRealtimeRun` keeps its "already completed" bookkeeping in instance refs
 * and in SWR entries keyed off a per-instance `useId`, neither of which resets
 * when the `runId` argument changes — so a second run inside a surviving
 * instance would inherit the first run's completed state and never fire
 * `onComplete` again. A fresh instance per run sidesteps that entirely.
 *
 * The canvas is deliberately not touched here: the agent writes nodes and edges
 * through the same collaborative flow the client renders from, so those changes
 * arrive over Liveblocks on their own. This watcher only reports the outcome.
 */
export function DesignRunWatcher({
  runId,
  accessToken,
  onFinish,
}: DesignRunWatcherProps) {
  // The subscription's completion effect fires from inside the Trigger hook, so
  // it reads the callback through a ref to avoid capturing a stale closure.
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])

  useRealtimeRun<typeof designAgent>(runId, {
    accessToken,
    onComplete: (run, error) => {
      if (run.isSuccess) {
        onFinishRef.current({
          ok: true,
          summary: run.output?.summary?.trim() || COMPLETED_FALLBACK,
        })
        return
      }

      const message =
        error?.message.trim() || run.error?.message?.trim() || FAILED_FALLBACK

      onFinishRef.current({ ok: false, message })
    },
  })

  return null
}
