import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { EditorWorkspace } from "@/components/editor/editor-workspace"
import { listOwnedProjects, listSharedProjects } from "@/lib/projects"
import type { Project } from "@/types/project"

/**
 * Editor home — a server component. Fetches the signed-in user's owned and
 * shared projects and hands both lists to the client workspace shell. No
 * client-side fetching for the initial load.
 */
export default async function EditorPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress

  const [ownedProjects, sharedProjects] = await Promise.all([
    listOwnedProjects(userId),
    email ? listSharedProjects(email) : Promise.resolve<Project[]>([]),
  ])

  return (
    <EditorWorkspace
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    />
  )
}
