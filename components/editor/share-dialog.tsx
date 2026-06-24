"use client"

import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import type { KeyboardEvent } from "react"
import { Check, Copy, Loader2, Trash2 } from "lucide-react"

import { EditorDialog } from "@/components/editor/editor-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { AccessMember } from "@/types/collaborator"

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  /** Owners may invite/remove; collaborators see the list read-only. */
  canManage: boolean
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Share dialog for a project. Owners can invite collaborators by email, see the
 * people with access (owner + collaborators), remove collaborators, and copy the
 * project link. Collaborators see the list read-only. Names/avatars come from
 * Clerk when known.
 */
export function ShareDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  canManage,
}: ShareDialogProps) {
  const [members, setMembers] = useState<AccessMember[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const [email, setEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [removingId, setRemovingId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Load the access list each time the dialog opens.
  useEffect(() => {
    if (!open) return

    let active = true

    async function loadMembers() {
      setListLoading(true)
      setListError(null)
      setInviteError(null)
      setEmail("")
      setCopied(false)

      try {
        const response = await fetch(
          `/api/projects/${projectId}/collaborators`
        )
        if (!response.ok) throw new Error("Request failed")
        const data = (await response.json()) as { members: AccessMember[] }
        if (active) setMembers(data.members)
      } catch {
        if (active) setListError("Couldn't load people with access.")
      } finally {
        if (active) setListLoading(false)
      }
    }

    void loadMembers()

    return () => {
      active = false
    }
  }, [open, projectId])

  const trimmedEmail = email.trim()
  // Block invites until the initial load settles: a slow GET resolving after a
  // successful invite would otherwise overwrite the just-added member.
  const canInvite =
    !inviting && !listLoading && EMAIL_PATTERN.test(trimmedEmail.toLowerCase())

  const submitInvite = useCallback(async () => {
    const normalized = trimmedEmail.toLowerCase()
    if (!EMAIL_PATTERN.test(normalized)) return

    setInviting(true)
    setInviteError(null)

    try {
      const response = await fetch(
        `/api/projects/${projectId}/collaborators`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalized }),
        }
      )

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null
        throw new Error(data?.error ?? "Couldn't invite that person.")
      }

      const member = (await response.json()) as AccessMember
      setMembers((current) => [...current, member])
      setEmail("")
    } catch (error) {
      setInviteError(
        error instanceof Error ? error.message : "Couldn't invite that person."
      )
    } finally {
      setInviting(false)
    }
  }, [trimmedEmail, projectId])

  const removeCollaborator = useCallback(
    async (collaboratorId: string) => {
      setRemovingId(collaboratorId)
      setInviteError(null)

      try {
        const response = await fetch(
          `/api/projects/${projectId}/collaborators/${collaboratorId}`,
          { method: "DELETE" }
        )

        if (!response.ok) throw new Error("Request failed")

        setMembers((current) =>
          current.filter((member) => member.id !== collaboratorId)
        )
      } catch {
        setInviteError("Couldn't remove that collaborator.")
      } finally {
        setRemovingId(null)
      }
    },
    [projectId]
  )

  const copyLink = useCallback(async () => {
    const url = `${window.location.origin}/editor/${projectId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setInviteError("Couldn't copy the link.")
    }
  }, [projectId])

  return (
    <EditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Share project"
      description={
        canManage
          ? `Invite people to collaborate on "${projectName}".`
          : `People with access to "${projectName}".`
      }
      className="sm:max-w-md"
      footer={
        canManage ? (
          <Button variant="outline" onClick={copyLink} className="gap-1.5">
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy link
              </>
            )}
          </Button>
        ) : null
      }
    >
      <div className="flex min-w-0 flex-col gap-4">
        {canManage ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <Input
                value={email}
                type="email"
                aria-label="Invite by email"
                placeholder="teammate@company.com"
                className="text-copy-primary"
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={onEnterSubmit(submitInvite, !canInvite)}
              />
              <Button onClick={submitInvite} disabled={!canInvite}>
                {inviting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Invite"
                )}
              </Button>
            </div>
            {inviteError ? (
              <p className="text-sm text-error">{inviteError}</p>
            ) : null}
          </div>
        ) : (
          inviteError && <p className="text-sm text-error">{inviteError}</p>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium text-copy-primary">
              People with access
            </p>
            {!listLoading && !listError ? (
              <span className="text-xs text-copy-muted">
                {members.length} total
              </span>
            ) : null}
          </div>

          {listLoading ? (
            <div className="flex items-center justify-center py-6 text-copy-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : listError ? (
            <p className="py-4 text-sm text-error">{listError}</p>
          ) : (
            <ScrollArea className="max-h-72">
              <ul className="flex flex-col gap-1.5 pr-2">
                {members.map((member) => (
                  <MemberRow
                    key={member.id ?? `owner-${member.email}`}
                    member={member}
                    canManage={canManage}
                    removing={member.id !== null && removingId === member.id}
                    onRemove={() =>
                      member.id ? removeCollaborator(member.id) : undefined
                    }
                  />
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
      </div>
    </EditorDialog>
  )
}

interface MemberRowProps {
  member: AccessMember
  canManage: boolean
  removing: boolean
  onRemove: () => void
}

function MemberRow({ member, canManage, removing, onRemove }: MemberRowProps) {
  const isOwner = member.role === "owner"
  // Owners are never removable; collaborators can be removed by a manager.
  const canRemove = canManage && !isOwner && member.id !== null
  // Treat a blank/whitespace-only Clerk name as "no name" so the label never
  // renders empty; fall back to the email and skip the duplicate email line.
  const normalizedName = member.name?.trim() ?? ""
  const displayName = normalizedName || member.email
  const showEmail = normalizedName.length > 0 && member.email !== ""

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-surface-border bg-base/40 px-3 py-2.5">
      <MemberAvatar member={member} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-2">
          <span
            title={displayName}
            className="min-w-0 truncate text-sm text-copy-primary"
          >
            {displayName}
          </span>
          <RoleBadge role={member.role} />
        </div>
        {showEmail ? (
          <span className="truncate text-xs text-copy-muted">
            {member.email}
          </span>
        ) : null}
      </div>

      {canRemove ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={removing}
          className="text-error hover:text-error"
          aria-label={`Remove ${displayName}`}
        >
          {removing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      ) : null}
    </li>
  )
}

function RoleBadge({ role }: { role: AccessMember["role"] }) {
  const isOwner = role === "owner"
  return (
    <span
      className={cn(
        "shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase",
        isOwner
          ? "border-brand/40 text-brand"
          : "border-surface-border text-copy-muted"
      )}
    >
      {isOwner ? "Owner" : "Collaborator"}
    </span>
  )
}

function MemberAvatar({ member }: { member: AccessMember }) {
  if (member.imageUrl) {
    return (
      <Image
        src={member.imageUrl}
        alt=""
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    )
  }

  // Mirror MemberRow's label fallback so a whitespace-only name doesn't yield a
  // blank initial.
  const label = member.name?.trim() || member.email || "?"
  const initial = label.charAt(0).toUpperCase()

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ai text-sm font-medium text-copy-primary">
      {initial}
    </div>
  )
}

/** Submit on Enter unless the action is disabled. */
function onEnterSubmit(submit: () => void, disabled: boolean) {
  return (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return
    event.preventDefault()
    if (disabled) return
    submit()
  }
}
