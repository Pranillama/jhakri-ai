"use client"

import { useFeedMessages } from "@liveblocks/react"

import {
  AI_STATUS_FEED_ID,
  parseAiStatusMessage,
  type AiStatusMessage,
} from "@/types/tasks"

/** The newest valid status message, plus when it was published. */
export interface AiStatus extends AiStatusMessage {
  /** Epoch milliseconds the message was added to the feed. */
  at: number
}

/**
 * Subscribes to the room's shared `ai-status-feed` and returns only the most
 * recent status message — the one thing every surface in the editor shows.
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
export function useAiStatus(): AiStatus | null {
  const { messages, error, isLoading } = useFeedMessages(AI_STATUS_FEED_ID)

  if (isLoading || error || !messages) return null

  // Messages arrive oldest-first, so the newest valid one is the last that
  // parses. Walking backwards means one malformed message can't hide the run's
  // real current status.
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    const data = parseAiStatusMessage(message.data)

    if (data) {
      return { ...data, at: message.createdAt }
    }
  }

  return null
}
