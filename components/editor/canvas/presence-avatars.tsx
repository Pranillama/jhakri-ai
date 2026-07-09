"use client"

import Image from "next/image"
import { UserButton, useUser } from "@clerk/nextjs"
import { shallow, useOthers } from "@liveblocks/react/suspense"

const MAX_VISIBLE = 5

/**
 * Floating avatar group pinned to the top-right of the canvas. Renders the
 * current user via the existing Clerk `UserButton` and the other room
 * participants as compact overlapping avatars — filtered to exclude the current
 * Clerk user so the same person never appears twice. A vertical divider
 * separates collaborators from the `UserButton` only when at least one
 * collaborator is present.
 */
export function PresenceAvatars() {
  const { user } = useUser()
  const currentUserId = user?.id

  const collaborators = useOthers(
    (others) =>
      others
        .filter((other) => other.id && other.id !== currentUserId)
        .map((other) => ({
          connectionId: other.connectionId,
          name: other.info?.name ?? "Anonymous",
          avatar: other.info?.avatar,
          color: other.info?.color ?? "#808080",
        })),
    shallow,
  )

  const visible = collaborators.slice(0, MAX_VISIBLE)
  const overflow = collaborators.length - visible.length
  const hasCollaborators = collaborators.length > 0

  return (
    <div className="pointer-events-auto absolute top-3 right-3 z-20 flex items-center gap-2 rounded-full border border-surface-border bg-elevated/80 px-2 py-1 backdrop-blur-sm">
      {hasCollaborators ? (
        <>
          <div className="flex items-center -space-x-2">
            {visible.map((other) => (
              <CollaboratorAvatar
                key={other.connectionId}
                name={other.name}
                avatar={other.avatar}
                color={other.color}
              />
            ))}
            {overflow > 0 ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-elevated bg-subtle text-[11px] font-medium text-copy-secondary">
                +{overflow}
              </div>
            ) : null}
          </div>
          <div className="h-6 w-px bg-surface-border" />
        </>
      ) : null}
      <UserButton
        appearance={{
          elements: {
            userButtonAvatarBox: { width: 32, height: 32 },
            userButtonTrigger: { width: 32, height: 32, padding: 0 },
          },
        }}
      />
    </div>
  )
}

interface CollaboratorAvatarProps {
  name: string
  avatar: string | undefined
  color: string
}

/**
 * A single non-interactive collaborator avatar. Renders the Clerk profile
 * image when present and falls back to the first letter of the name tinted
 * with the participant's presence color.
 */
function CollaboratorAvatar({ name, avatar, color }: CollaboratorAvatarProps) {
  if (avatar) {
    return (
      <div
        title={name}
        className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-elevated"
      >
        <Image
          src={avatar}
          alt=""
          width={32}
          height={32}
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  const initial = (name.trim() || "?").charAt(0).toUpperCase()

  return (
    <div
      title={name}
      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-elevated text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {initial}
    </div>
  )
}
