"use client"

import { useFeedMessages } from "@liveblocks/react"

import {
  AI_STATUS_FEED_ID,
  parseAiStatusMessage,
  type AiStatusMessage,
  type AiTaskKind,
} from "@/types/tasks"

/** The newest valid status message, plus when it was published. */
export interface AiStatus extends AiStatusMessage {
  /** Epoch milliseconds the message was added to the feed. */
  at: number
}

/**
 * Subscribes to the room's shared `ai-status-feed` and returns the most recent
 * status message.
 *
 * With no `task` argument, this is the single latest message across every
 * generator — what `AiStatusBanner` wants, since it shows whichever run is
 * currently active in the room regardless of which one started it. Passed a
 * `task`, it instead returns that generator's own latest message, skipping any
 * newer messages from a *different* task rather than being shadowed by them —
 * without this, a design run starting while a spec run is still in flight would
 * make the spec's own completion invisible to a caller only watching for it,
 * since the design run's message would be "the newest" in the untargeted search.
 *
 * Feed payloads are validated before they leave this hook, so a message written
 * by an older publisher (or by anything else) is skipped rather than rendered;
 * the search walks backwards so a single bad message can't hide the run's real
 * latest status.
 *
 * Uses the non-suspense hook deliberately: the AI sidebar sits outside the
 * canvas's suspense boundary, and a room that has never had an AI run has no
 * feed at all — both cases resolve to "no status" instead of a fallback or a
 * thrown error.
 */
export function useAiStatus(task?: AiTaskKind): AiStatus | null {
  const { messages, error, isLoading } = useFeedMessages(AI_STATUS_FEED_ID)

  if (isLoading || error || !messages) return null

  // Messages arrive oldest-first, so the newest valid one is the last that
  // parses. Walking backwards means one malformed message can't hide the run's
  // real current status.
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    const data = parseAiStatusMessage(message.data)

    if (data && (task === undefined || data.task === task)) {
      return { ...data, at: message.createdAt }
    }
  }

  return null
}
