"use client"

import { useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CanvasRoom } from "@/components/editor/canvas/canvas-room"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ShareDialog } from "@/components/editor/share-dialog"
import { cn } from "@/lib/utils"
import { useProjectDialogs } from "@/hooks/use-project-dialogs"
import type { Project, ProjectOwnership } from "@/types/project"

interface EditorRoomShellProps {
  roomId: string
  projectName: string
  /** How the current user has access; owners can manage collaborators. */
  ownership: ProjectOwnership
  ownedProjects: Project[]
  sharedProjects: Project[]
}

/**
 * Full-viewport workspace shell for an open project room. Holds the left
 * sidebar and right AI-sidebar open state plus the shared project-dialog hook,
 * and lays out the navbar, project sidebar, central canvas placeholder, and AI
 * sidebar placeholder. No canvas, Liveblocks, AI, or sharing logic yet.
 */
export function EditorRoomShell({
  roomId,
  projectName,
  ownership,
  ownedProjects,
  sharedProjects,
}: EditorRoomShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const dialogs = useProjectDialogs()

  return (
    <div className="flex h-dvh flex-col bg-base">
      <EditorNavbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        projectName={projectName}
        aiSidebarOpen={aiSidebarOpen}
        onToggleAiSidebar={() => setAiSidebarOpen((open) => !open)}
        onShare={() => setShareOpen(true)}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <ProjectSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          ownedProjects={ownedProjects}
          sharedProjects={sharedProjects}
          currentProjectId={roomId}
          onCreateProject={dialogs.openCreate}
          onRenameProject={dialogs.openRename}
          onDeleteProject={dialogs.openDelete}
        />

        <CanvasRoom roomId={roomId} />

        <AiSidebar
          isOpen={aiSidebarOpen}
          onClose={() => setAiSidebarOpen(false)}
        />
      </div>

      <ProjectDialogs dialogs={dialogs} />

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        projectId={roomId}
        projectName={projectName}
        canManage={ownership === "owned"}
      />
    </div>
  )
}

/** Right-hand placeholder panel reserved for the future AI chat. */
function AiSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <aside
      aria-hidden={!isOpen}
      inert={!isOpen}
      className={cn(
        "absolute inset-y-0 right-0 z-40 flex w-80 flex-col border-l border-surface-border bg-surface/95 backdrop-blur-sm transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-4 py-3">
        <h2 className="text-sm font-medium text-copy-primary">AI Assistant</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close AI sidebar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-copy-muted">
        AI chat coming soon.
      </div>
    </aside>
  )
}
