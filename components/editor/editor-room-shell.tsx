"use client"

import { useCallback, useRef, useState } from "react"

import { AiSidebar } from "@/components/editor/ai-sidebar"
import { CanvasRoom } from "@/components/editor/canvas/canvas-room"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ShareDialog } from "@/components/editor/share-dialog"
import type { SaveStatus } from "@/hooks/use-canvas-autosave"
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
 * and lays out the navbar, project sidebar, collaborative canvas, and the
 * floating AI sidebar. AI generation logic is not wired yet.
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
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const dialogs = useProjectDialogs()

  // The manual save function lives inside the Liveblocks room (Canvas), which
  // sits below this shell — Canvas registers it here via a ref so the
  // navbar's Save button (outside the room) can call the exact same save the
  // autosave hook uses.
  const saveRef = useRef<() => void>(() => {})
  const handleRegisterSave = useCallback((save: () => void) => {
    saveRef.current = save
  }, [])

  return (
    <div className="flex h-dvh flex-col bg-base">
      <EditorNavbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        projectName={projectName}
        saveStatus={saveStatus}
        onSave={() => saveRef.current()}
        aiSidebarOpen={aiSidebarOpen}
        onToggleAiSidebar={() => setAiSidebarOpen((open) => !open)}
        onShare={() => setShareOpen(true)}
        onOpenTemplates={() => setTemplatesOpen(true)}
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

        <CanvasRoom
          roomId={roomId}
          templatesOpen={templatesOpen}
          onTemplatesOpenChange={setTemplatesOpen}
          onSaveStatusChange={setSaveStatus}
          onRegisterSave={handleRegisterSave}
        />

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
