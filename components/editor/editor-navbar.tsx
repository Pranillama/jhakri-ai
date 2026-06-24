"use client"

import { PanelLeftClose, PanelLeftOpen, Share2, Sparkles } from "lucide-react"
import { UserButton } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"

interface EditorNavbarProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  /** Name of the open project, shown centered. Omitted on the editor home. */
  projectName?: string
  /** Whether the AI sidebar is open; controls the toggle's pressed state. */
  aiSidebarOpen?: boolean
  /**
   * Toggles the AI sidebar. When provided, the navbar renders the workspace
   * actions (share + AI toggle); omitted on the editor home.
   */
  onToggleAiSidebar?: () => void
  /** Opens the share dialog. */
  onShare?: () => void
}

export function EditorNavbar({
  sidebarOpen,
  onToggleSidebar,
  projectName,
  aiSidebarOpen,
  onToggleAiSidebar,
  onShare,
}: EditorNavbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-surface-border bg-surface px-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center px-4">
        {projectName ? (
          <span className="truncate text-sm font-medium text-copy-primary">
            {projectName}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {onToggleAiSidebar ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onShare}
              aria-label="Share project"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button
              variant={aiSidebarOpen ? "secondary" : "ghost"}
              size="icon"
              onClick={onToggleAiSidebar}
              aria-pressed={aiSidebarOpen}
              aria-label={
                aiSidebarOpen ? "Close AI assistant" : "Open AI assistant"
              }
            >
              <Sparkles className="h-5 w-5" />
            </Button>
          </>
        ) : null}
        <UserButton />
      </div>
    </header>
  )
}
