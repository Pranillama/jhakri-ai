"use client"

import { useCallback } from "react"
import { useCreateFeedMessage, useFeedMessages, useSelf } from "@liveblocks/react"

import { AI_AGENT } from "@/types/ai-status"
import {
  AI_CHAT_FEED_ID,
  chatMessageSchema,
  parseChatMessage,
  type ChatMessage,
  type ChatMessageRole,
} from "@/types/tasks"

/** One validated `ai-chat` feed message, with its stable feed message id. */
export interface ChatFeedMessage extends ChatMessage {
  id: string
}

interface UseAiChatResult {
  /** Validated chat messages, oldest first. Unparseable messages are skipped. */
  messages: ChatFeedMessage[]
  /** Display name the current user's own messages are attributed to. */
  currentSender: string
  /** Publishes one chat message to the room's shared `ai-chat` feed. */
  send: (content: string) => Promise<void>
  /**
   * Publishes one message attributed to the AI agent — a design run's closing
   * summary, or the reason it failed. It goes on the same feed as human chat,
   * distinguished by `role`, so everyone in the room sees one conversation.
   */
  sendAssistantMessage: (content: string) => Promise<void>
}

const ANONYMOUS_SENDER = "Anonymous"

/**
 * Subscribes to the room's shared `ai-chat` feed and exposes a function to
 * send new messages into it. Kept separate from `useAiStatus`/`ai-status-feed`
 * — that feed carries AI run progress, this one carries collaborative chat —
 * so a reader never has to guess which schema a given message belongs to.
 *
 * Uses the non-suspense feed hook, matching `useAiStatus`: the sidebar sits
 * outside the canvas's suspense boundary, and while the feed is loading there
 * is nothing meaningful to render but an empty conversation.
 */
export function useAiChat(): UseAiChatResult {
  const { messages: raw } = useFeedMessages(AI_CHAT_FEED_ID)
  const createFeedMessage = useCreateFeedMessage()
  const currentSender = useSelf((me) => me.info.name) ?? ANONYMOUS_SENDER

  // Messages arrive oldest-first already, which is the order the chat renders
  // in; a message that fails validation (older/newer publisher, bad data) is
  // dropped rather than shown.
  const messages: ChatFeedMessage[] = (raw ?? []).flatMap((message) => {
    const data = parseChatMessage(message.data)
    return data ? [{ ...data, id: message.id }] : []
  })

  const publish = useCallback(
    async (role: ChatMessageRole, sender: string, content: string) => {
      const trimmed = content.trim()
      if (!trimmed) return

      const data = chatMessageSchema.parse({
        sender,
        role,
        content: trimmed,
        timestamp: Date.now(),
      })

      await createFeedMessage(AI_CHAT_FEED_ID, data)
    },
    [createFeedMessage]
  )

  const send = useCallback(
    (content: string) => publish("user", currentSender, content),
    [publish, currentSender]
  )

  // Attributed to the agent's shared identity rather than to whoever started
  // the run, so the reply reads the same for every participant.
  const sendAssistantMessage = useCallback(
    (content: string) => publish("assistant", AI_AGENT.name, content),
    [publish]
  )

  return { messages, currentSender, send, sendAssistantMessage }
}
