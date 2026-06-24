"use client"

import { useState } from "react"

import { EditorHome } from "@/components/editor/editor-home"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { useProjectDialogs } from "@/hooks/use-project-dialogs"
import type { Project } from "@/types/project"

interface EditorWorkspaceProps {
  ownedProjects: Project[]
  sharedProjects: Project[]
}

/**
 * Client shell for the editor home: holds sidebar open state and the shared
 * project-dialog hook, and renders the navbar, sidebar, home, and dialogs.
 * Project lists are fetched server-side and passed in as props.
 */
export function EditorWorkspace({
  ownedProjects,
  sharedProjects,
}: EditorWorkspaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const dialogs = useProjectDialogs()

  return (
    <div className="flex h-dvh flex-col bg-base">
      <EditorNavbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <ProjectSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          ownedProjects={ownedProjects}
          sharedProjects={sharedProjects}
          onCreateProject={dialogs.openCreate}
          onRenameProject={dialogs.openRename}
          onDeleteProject={dialogs.openDelete}
        />

        <EditorHome onCreateProject={dialogs.openCreate} />
      </div>

      <ProjectDialogs dialogs={dialogs} />
    </div>
  )
}
