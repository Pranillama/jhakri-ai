import Link from "next/link"
import { Lock } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * Shown when a project does not exist or the signed-in user has no access to it.
 * Full-viewport centered message with a link back to the editor home.
 */
export function AccessDenied() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-5 bg-base px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-elevated text-copy-muted">
        <Lock className="h-6 w-6" />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-copy-primary">
          No access to this project
        </h1>
        <p className="max-w-md text-sm text-copy-muted">
          This project doesn&apos;t exist, or you don&apos;t have permission to
          open it.
        </p>
      </div>

      <Button asChild variant="outline">
        <Link href="/editor">Back to projects</Link>
      </Button>
    </div>
  )
}
