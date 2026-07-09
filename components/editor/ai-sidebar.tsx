"use client"

import { useRef, useState } from "react"
import {
  Bot,
  Download,
  FileText,
  Send,
  Sparkles,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

/** Prompt suggestions shown in the AI Architect empty state. */
const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
] as const

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Floating AI chat sidebar that slides in from the right. Open/close state is
 * controlled by the parent; this component owns only the sidebar UI — a header,
 * an "AI Architect" chat tab, and a "Specs" tab. No AI, Liveblocks, or backend
 * logic yet: sending only appends the typed message locally so the chat layout
 * is exercised.
 */
export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
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
          <ArchitectTab />
        </TabsContent>

        <TabsContent
          value="specs"
          className="min-h-0 overflow-y-auto p-3"
        >
          <SpecsTab />
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

function ArchitectTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function send() {
    const content = draft.trim()
    if (!content) return
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, role: "user", content },
    ])
    setDraft("")
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  function applyStarter(prompt: string) {
    setDraft(prompt)
    textareaRef.current?.focus()
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 ? (
          <EmptyState onStarter={applyStarter} />
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-surface-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to design…"
            rows={1}
            className="max-h-40 min-h-[72px] flex-1 resize-none rounded-xl bg-surface text-copy-primary placeholder:text-copy-faint"
          />
          <Button
            size="icon"
            onClick={send}
            disabled={!draft.trim()}
            aria-label="Send message"
            className="bg-ai text-white hover:bg-ai/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-copy-faint">
          Enter to send · Shift + Enter for a new line
        </p>
      </div>
    </>
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

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
          isUser
            ? "border-2 border-brand/50 bg-brand-dim text-copy-primary"
            : "border border-surface-border bg-elevated text-ai-text"
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

function SpecsTab() {
  return (
    <div className="flex flex-col gap-4">
      <Button
        className="w-full bg-ai text-white hover:bg-ai/90"
        aria-label="Generate spec"
      >
        <Sparkles className="h-4 w-4" />
        Generate Spec
      </Button>

      <div className="rounded-2xl border border-surface-border bg-elevated p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ai/15 text-ai-text">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium text-copy-primary">
              E-commerce Backend Spec
            </h3>
            <p className="mt-1 line-clamp-2 text-xs text-copy-muted">
              A service-oriented backend with an API gateway, catalog and order
              services, a payment integration, and a Postgres data layer.
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled
            aria-label="Download spec"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>
    </div>
  )
}
