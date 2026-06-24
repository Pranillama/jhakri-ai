import { redirect } from "next/navigation"

import { EditorWorkspace } from "@/components/editor/editor-workspace"
import { getCurrentIdentity } from "@/lib/project-access"
import { listOwnedProjects, listSharedProjects } from "@/lib/projects"

/**
 * Editor home — a server component. Fetches the signed-in user's owned and
 * shared projects and hands both lists to the client workspace shell. No
 * client-side fetching for the initial load.
 */
export default async function EditorPage() {
  const identity = await getCurrentIdentity()

  if (!identity) {
    redirect("/sign-in")
  }

  const [ownedProjects, sharedProjects] = await Promise.all([
    listOwnedProjects(identity.userId),
    listSharedProjects(identity.emails),
  ])

  return (
    <EditorWorkspace
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    />
  )
}
