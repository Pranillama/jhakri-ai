"use client"

import { AlertCircle, Check, Loader2, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"

import { useAiStatus } from "@/hooks/use-ai-status"
import { aiStatusText, isActiveRunState, type AiRunState } from "@/types/tasks"
import { cn } from "@/lib/utils"

/** How long a finished run's banner stays on screen before it clears. */
const TERMINAL_VISIBLE_MS = 8000

const STATE_STYLES: Record<
  AiRunState,
  { icon: typeof Sparkles; spin: boolean; className: string }
> = {
  thinking: { icon: Sparkles, spin: false, className: "text-ai-text" },
  working: { icon: Loader2, spin: true, className: "text-ai-text" },
  complete: { icon: Check, spin: false, className: "text-success" },
  error: { icon: AlertCircle, spin: false, className: "text-error" },
}

/**
 * The shared AI status feed, pinned to the top-center of the canvas.
 *
 * Reads the latest message the AI agent published into the room's
 * `ai-status-feed`, so every participant sees the same message at the same
 * time — including someone who opens the project mid-run. Renders nothing when
 * no run has touched this room, and clears itself a few seconds after a run
 * finishes.
 */
export function AiStatusBanner() {
  const status = useAiStatus()

  // A finished run's banner has to disappear on a timer, not on the next feed
  // message — there may not be another one for hours. The dismissal is recorded
  // as the message timestamp it applies to rather than a boolean, so a newer
  // status un-dismisses the banner without the effect having to reset state on
  // every render pass.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null)
  const at = status?.at
  const terminal = status ? !isActiveRunState(status.state) : false

  useEffect(() => {
    if (!terminal || at === undefined) return

    const remaining = Math.max(at + TERMINAL_VISIBLE_MS - Date.now(), 0)
    const timer = setTimeout(() => setDismissedAt(at), remaining)
    return () => clearTimeout(timer)
  }, [terminal, at])

  if (!status || dismissedAt === at) return null

  const { icon: Icon, spin, className } = STATE_STYLES[status.state]

  return (
    <div className="pointer-events-none absolute top-3 left-1/2 z-20 -translate-x-1/2">
      <div
        role="status"
        aria-live="polite"
        className="flex max-w-md items-center gap-2 rounded-full border border-surface-border bg-elevated/90 py-1.5 pr-4 pl-3 shadow-lg backdrop-blur-sm"
      >
        <Icon
          className={cn("h-4 w-4 shrink-0", className, spin && "animate-spin")}
        />
        <span className="truncate text-xs font-medium text-copy-secondary">
          {aiStatusText(status)}
        </span>
      </div>
    </div>
  )
}
