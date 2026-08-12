"use client"

import { useCallback, useRef, useState } from "react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import {
  Bot,
  Download,
  FileText,
  Loader2,
  Send,
  Sparkles,
  X,
} from "lucide-react"

import {
  DesignRunWatcher,
  type DesignRunOutcome,
} from "@/components/editor/design-run-watcher"
import { SpecPreviewModal } from "@/components/editor/spec-preview-modal"
import {
  SpecRunWatcher,
  type SpecRunOutcome,
} from "@/components/editor/spec-run-watcher"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useAiChat, type ChatFeedMessage } from "@/hooks/use-ai-chat"
import { useAiStatus } from "@/hooks/use-ai-status"
import { useProjectSpecs } from "@/hooks/use-project-specs"
import { startDesignRun, type DesignRunHandle } from "@/lib/ai-design-run"
import { startSpecRun, type SpecRunHandle } from "@/lib/ai-spec-run"
import { specDownloadUrl } from "@/lib/project-specs"
import type { CanvasEdge, CanvasNode } from "@/types/canvas"
import { aiStatusText, isActiveRunState } from "@/types/tasks"
import type { ProjectSpecSummary } from "@/types/project-spec"
import { cn } from "@/lib/utils"

/** Prompt suggestions shown in the AI Architect empty state. */
const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
] as const

/**
 * Near-black copy for anything sitting on the green agent accent. Written as an
 * arbitrary value because Tailwind's `text-base` is a font size, so the theme's
 * `--color-base` is not reachable as a text-color utility.
 */
const ON_AGENT_TEXT = "text-[color:var(--bg-base)]"

/** Shown in the status strip before the run publishes its first update. */
const STARTING_TEXT = "Starting the design run…"

/** Shown above the Generate Spec button before the run publishes its first update. */
const SPEC_STARTING_TEXT = "Starting spec generation…"

/**
 * Publishes an agent message without letting a feed write become an unhandled
 * rejection. These calls report an outcome the user can already see on the
 * canvas and in the status strip, so a failure to write the chat line is worth
 * logging, not worth interrupting the sidebar for.
 */
function postAgentMessage(
  publish: (content: string) => Promise<void>,
  content: string
) {
  publish(content).catch((error: unknown) => {
    console.error("Failed to publish an AI message to the chat feed", error)
  })
}

/** Turns a thrown value into something worth showing in the chat feed. */
function describeError(
  error: unknown,
  fallback = "Something went wrong starting the design run."
): string {
  const message = error instanceof Error ? error.message.trim() : ""
  return message || fallback
}

interface AiSidebarProps {
  isOpen: boolean
  /** Liveblocks room ID the design run is generated into. */
  roomId: string
  onClose: () => void
}

/**
 * Floating AI chat sidebar that slides in from the right. Open/close state is
 * controlled by the parent; this component owns the sidebar UI — a header, an
 * "AI Architect" chat tab, and a "Specs" tab.
 *
 * The chat is real-time collaborative chat, backed by the room's shared
 * `ai-chat` feed — every participant sees the same conversation. Submitting a
 * prompt also starts a design run: the message goes on the feed, the run is
 * triggered, and the agent's edits arrive on the canvas through Liveblocks on
 * their own. While a run is in progress the composer shows the room's shared
 * status and stops accepting new prompts; everything else stays usable.
 */
export function AiSidebar({ isOpen, roomId, onClose }: AiSidebarProps) {
  return (
    <aside
      aria-hidden={!isOpen}
      inert={!isOpen}
      className={cn(
        "absolute inset-y-0 right-0 z-40 flex w-96 flex-col border-l border-surface-border bg-base/95 shadow-2xl backdrop-blur-sm transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <SidebarHeader onClose={onClose} />

      <Tabs
        defaultValue="architect"
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="shrink-0 px-3 pt-3">
          <TabsList className="h-9 w-full bg-surface p-1">
            <SidebarTab value="architect" icon={Sparkles} label="AI Architect" />
            <SidebarTab value="specs" icon={FileText} label="Specs" />
          </TabsList>
        </div>

        <TabsContent
          value="architect"
          className="flex min-h-0 flex-col overflow-hidden"
        >
          <ArchitectTab roomId={roomId} />
        </TabsContent>

        <TabsContent
          value="specs"
          className="min-h-0 overflow-y-auto p-3"
        >
          <SpecsTab projectId={roomId} />
        </TabsContent>
      </Tabs>
    </aside>
  )
}

function SidebarHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-ai/15 text-ai-text">
          <Bot className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-copy-primary">
            AI Workspace
          </h2>
          <p className="truncate text-xs text-copy-muted">
            Collaborate with Jhakri AI
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        aria-label="Close AI sidebar"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

function SidebarTab({
  value,
  icon: Icon,
  label,
}: {
  value: string
  icon: typeof Sparkles
  label: string
}) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "flex-1 text-copy-muted",
        "data-active:bg-ai/15 data-active:text-ai-text data-active:shadow-none",
        "dark:data-active:border-transparent dark:data-active:bg-ai/15 dark:data-active:text-ai-text"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </TabsTrigger>
  )
}

function ArchitectTab({ roomId }: { roomId: string }) {
  const [draft, setDraft] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [activeRun, setActiveRun] = useState<DesignRunHandle | null>(null)
  const [sendFailed, setSendFailed] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { messages, currentSender, send, sendAssistantMessage } = useAiChat()

  // Shared, not local: the status comes from the room's feed, so a run someone
  // else started puts every participant's composer into the same state.
  const status = useAiStatus()
  const feedActive =
    status !== null && status.task === "design" && isActiveRunState(status.state)

  // Two sources, because neither covers the whole run on its own. The feed is
  // the shared view, but it stays silent between submitting the prompt and the
  // task publishing its first update; the local run is what closes that gap —
  // and it only exists for the participant who started the run.
  const running = submitting || activeRun !== null || feedActive

  const handleRunFinished = useCallback(
    (outcome: DesignRunOutcome) => {
      setActiveRun(null)
      postAgentMessage(
        sendAssistantMessage,
        outcome.ok ? outcome.summary : outcome.message
      )
    },
    [sendAssistantMessage]
  )

  async function handleSubmit() {
    const prompt = draft.trim()
    if (!prompt || running) return

    setSubmitting(true)
    setSendFailed(false)

    // The prompt goes on the shared feed first, so the room sees who asked for
    // what even if triggering the run then fails. A failure here is the one
    // case that can't be reported *through* the feed, so it stays inline and
    // the draft is left in place to retry.
    try {
      await send(prompt)
    } catch {
      setSendFailed(true)
      setSubmitting(false)
      return
    }

    setDraft("")

    try {
      setActiveRun(await startDesignRun({ prompt, roomId }))
    } catch (error) {
      postAgentMessage(sendAssistantMessage, describeError(error))
    } finally {
      setSubmitting(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void handleSubmit()
    }
  }

  function applyStarter(prompt: string) {
    setDraft(prompt)
    textareaRef.current?.focus()
  }

  return (
    <>
      {/* Keyed per run: the subscription hook cannot be reused across runs.
          See DesignRunWatcher. */}
      {activeRun ? (
        <DesignRunWatcher
          key={activeRun.runId}
          runId={activeRun.runId}
          accessToken={activeRun.publicToken}
          onFinish={handleRunFinished}
        />
      ) : null}

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 ? (
          <EmptyState onStarter={applyStarter} />
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                isOwn={message.sender === currentSender}
              />
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-surface-border p-3">
        {running ? (
          <RunStatusStrip
            text={
              status && feedActive ? aiStatusText(status) : STARTING_TEXT
            }
          />
        ) : null}
        {sendFailed ? (
          <p role="alert" className="mb-2 text-xs text-error">
            Message failed to send. Try again.
          </p>
        ) : null}

        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={running}
            placeholder={
              running
                ? "Jhakri AI is working…"
                : "Describe the system you want to design…"
            }
            rows={1}
            className="max-h-40 min-h-[72px] flex-1 resize-none rounded-xl bg-surface text-copy-primary placeholder:text-copy-faint"
          />
          <Button
            size="icon"
            onClick={() => void handleSubmit()}
            disabled={running || !draft.trim()}
            aria-label={running ? "Generating design" : "Send prompt"}
            className={cn("bg-agent hover:bg-agent/90", ON_AGENT_TEXT)}
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-copy-faint">
          Enter to send · Shift + Enter for a new line
        </p>
      </div>
    </>
  )
}

/**
 * Compact in-progress readout above the composer. It shows the newest message
 * on the room's `ai-status-feed`, so everyone watching the project sees the
 * same line — deliberately a strip next to the input rather than an overlay,
 * since the rest of the sidebar stays usable while a run is going.
 */
function RunStatusStrip({ text }: { text: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-2 flex items-center gap-2 rounded-xl border border-surface-border bg-base px-3 py-2"
    >
      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-agent" />
      <span className="truncate text-xs font-medium text-copy-secondary">
        {text}
      </span>
    </div>
  )
}

function EmptyState({ onStarter }: { onStarter: (prompt: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-ai/15 text-ai-text">
        <Bot className="h-6 w-6" />
      </span>
      <p className="mt-4 text-sm font-medium text-copy-primary">
        Design with Jhakri AI
      </p>
      <p className="mt-1 text-xs text-copy-muted">
        Describe a system and get an architecture you can drop onto the canvas.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onStarter(prompt)}
            className="rounded-full bg-subtle px-3 py-1.5 text-xs text-ai-text transition-colors hover:bg-subtle/70"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Formats a chat message's epoch-millisecond timestamp as a local time. */
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })
}

/**
 * One message in the conversation. Colour is decided by `role` — every human
 * prompt is on the green accent, the agent's replies are on a dark surface —
 * while side is decided by who sent it, so a collaborator's prompt reads as
 * theirs without losing the user/AI distinction.
 */
function ChatBubble({
  message,
  isOwn,
}: {
  message: ChatFeedMessage
  isOwn: boolean
}) {
  const isAssistant = message.role === "assistant"
  const alignEnd = isOwn && !isAssistant

  return (
    <div
      className={cn("flex flex-col gap-1", alignEnd ? "items-end" : "items-start")}
    >
      <div className="flex items-center gap-1.5 px-1 text-[11px] text-copy-faint">
        <span className="font-medium text-copy-muted">{message.sender}</span>
        <span aria-hidden="true">·</span>
        <span>{formatTimestamp(message.timestamp)}</span>
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
          isAssistant
            ? "border border-surface-border bg-elevated text-copy-primary"
            : cn("bg-agent", ON_AGENT_TEXT)
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

/** Formats an ISO timestamp for the spec list rows. */
function formatSpecDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

/**
 * Specs tab: generates new specs and shows the project's existing ones,
 * fetched from the backend. Clicking a row opens the Markdown preview modal;
 * the download button next to it triggers the browser's normal file download
 * directly, without opening the modal.
 *
 * Generation reuses the same collaborative run-status feed as the AI
 * Architect tab (`task: "spec"`, discriminated from `"design"` so the two
 * don't block each other's button) — a run started by any participant is
 * reflected here for everyone, and its outcome posts into the shared
 * `ai-chat` feed exactly like a design run's does.
 */
function SpecsTab({ projectId }: { projectId: string }) {
  const { specs, loading, error, refresh } = useProjectSpecs(projectId)
  const [previewSpec, setPreviewSpec] = useState<ProjectSpecSummary | null>(
    null
  )
  const [submitting, setSubmitting] = useState(false)
  const [activeRun, setActiveRun] = useState<SpecRunHandle | null>(null)

  const { messages, sendAssistantMessage } = useAiChat()

  // Read-only subscription to the same collaborative canvas graph `Canvas`
  // renders from — this tab never mounts a `<ReactFlow>` or calls the
  // mutators this hook also returns, so it's just another reader of shared
  // Storage, not a second owner of it.
  const { nodes, edges } = useLiveblocksFlow<CanvasNode, CanvasEdge>({
    nodes: { initial: [] },
    edges: { initial: [] },
  })
  const canvasReady = nodes !== null && edges !== null

  const status = useAiStatus()
  const specFeedActive =
    status !== null && status.task === "spec" && isActiveRunState(status.state)
  const generating = submitting || activeRun !== null || specFeedActive

  const handleRunFinished = useCallback(
    (outcome: SpecRunOutcome) => {
      setActiveRun(null)
      if (outcome.ok) {
        postAgentMessage(sendAssistantMessage, "Generated a new spec.")
        refresh()
      } else {
        postAgentMessage(sendAssistantMessage, outcome.message)
      }
    },
    [sendAssistantMessage, refresh]
  )

  async function handleGenerate() {
    if (generating || !canvasReady) return

    setSubmitting(true)
    try {
      setActiveRun(
        await startSpecRun({
          roomId: projectId,
          chatHistory: messages,
          nodes,
          edges,
        })
      )
    } catch (err) {
      postAgentMessage(
        sendAssistantMessage,
        describeError(err, "Something went wrong starting spec generation.")
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Keyed per run, same reasoning as ArchitectTab's DesignRunWatcher. */}
      {activeRun ? (
        <SpecRunWatcher
          key={activeRun.runId}
          runId={activeRun.runId}
          accessToken={activeRun.publicToken}
          onFinish={handleRunFinished}
        />
      ) : null}

      <Button
        className="w-full bg-ai text-white hover:bg-ai/90"
        aria-label={generating ? "Generating spec" : "Generate spec"}
        onClick={() => void handleGenerate()}
        disabled={generating || !canvasReady}
      >
        {generating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {generating ? "Generating…" : "Generate Spec"}
      </Button>

      {generating ? (
        <RunStatusStrip
          text={status && specFeedActive ? aiStatusText(status) : SPEC_STARTING_TEXT}
        />
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-6 text-copy-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : error ? (
        <p className="py-4 text-center text-sm text-error">{error}</p>
      ) : specs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-surface-border px-4 py-8 text-center">
          <FileText className="h-6 w-6 text-copy-faint" />
          <p className="text-xs text-copy-muted">No specs generated yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {specs.map((spec) => (
            <SpecListItem
              key={spec.id}
              projectId={projectId}
              spec={spec}
              onPreview={() => setPreviewSpec(spec)}
            />
          ))}
        </ul>
      )}

      <SpecPreviewModal
        projectId={projectId}
        spec={previewSpec}
        onOpenChange={(open) => {
          if (!open) setPreviewSpec(null)
        }}
      />
    </div>
  )
}

function SpecListItem({
  projectId,
  spec,
  onPreview,
}: {
  projectId: string
  spec: ProjectSpecSummary
  onPreview: () => void
}) {
  return (
    <li className="flex items-center gap-2 rounded-2xl border border-surface-border bg-elevated p-3">
      <button
        type="button"
        onClick={onPreview}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ai/15 text-ai-text">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-copy-primary">
            {spec.filename}
          </p>
          <p className="mt-0.5 text-xs text-copy-muted">
            {formatSpecDate(spec.createdAt)}
          </p>
        </div>
      </button>
      <Button
        asChild
        variant="ghost"
        size="icon-sm"
        aria-label={`Download ${spec.filename}`}
      >
        <a href={specDownloadUrl(projectId, spec.id)}>
          <Download className="h-4 w-4" />
        </a>
      </Button>
    </li>
  )
}
