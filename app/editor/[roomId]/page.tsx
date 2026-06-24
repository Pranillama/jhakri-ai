import { redirect } from "next/navigation"

import { AccessDenied } from "@/components/editor/access-denied"
import { EditorRoomShell } from "@/components/editor/editor-room-shell"
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access"
import { listOwnedProjects, listSharedProjects } from "@/lib/projects"

interface EditorRoomPageProps {
  params: Promise<{ roomId: string }>
}

/**
 * Project workspace — a server component. Enforces access before rendering:
 * unauthenticated users redirect to sign-in, and missing or unauthorized
 * projects render `AccessDenied`. On success it loads the sidebar project lists
 * and hands the room context to the client workspace shell.
 */
export default async function EditorRoomPage({ params }: EditorRoomPageProps) {
  const { roomId } = await params

  const identity = await getCurrentIdentity()
  if (!identity) {
    redirect("/sign-in")
  }

  const project = await getAccessibleProject(roomId, identity)
  if (!project) {
    return <AccessDenied />
  }

  const [ownedProjects, sharedProjects] = await Promise.all([
    listOwnedProjects(identity.userId),
    listSharedProjects(identity.emails),
  ])

  return (
    <EditorRoomShell
      roomId={project.id}
      projectName={project.name}
      ownership={project.ownership}
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    />
  )
}
