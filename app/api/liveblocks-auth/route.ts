import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getLiveblocks, getUserColor } from "@/lib/liveblocks";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";

/** Extracts the Liveblocks room ID from the auth request body. */
function parseRoomId(body: unknown): string | undefined {
  if (body && typeof body === "object" && "room" in body) {
    const { room } = body as { room: unknown };
    if (typeof room === "string" && room.length > 0) {
      return room;
    }
  }

  return undefined;
}

/**
 * POST /api/liveblocks-auth — issue a Liveblocks session token for a room.
 *
 * The room ID is the project ID, so access is verified with the same helper the
 * editor route uses. The route requires Clerk auth, confirms the user owns or
 * collaborates on the project, ensures the room exists, and returns a session
 * token carrying the user's name, avatar, and deterministic cursor color.
 */
export async function POST(request: Request) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const roomId = parseRoomId(body);

  if (!roomId) {
    return NextResponse.json({ error: "Missing room" }, { status: 400 });
  }

  // The room ID is the project ID. Missing and unauthorized both collapse to
  // 403 so the route never reveals whether a project exists.
  const project = await getAccessibleProject(roomId, identity);

  if (!project) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await currentUser();
  const name =
    user?.fullName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress ??
    "Anonymous";
  const avatar = user?.imageUrl ?? "";
  const color = getUserColor(identity.userId);

  const liveblocks = getLiveblocks();

  // Ensure the room exists before connecting; private by default since the
  // session token below grants the verified user explicit access.
  await liveblocks.getOrCreateRoom(roomId, { defaultAccesses: [] });

  const session = liveblocks.prepareSession(identity.userId, {
    userInfo: { name, avatar, color },
  });
  session.allow(roomId, session.FULL_ACCESS);

  const { status, body: token } = await session.authorize();
  return new Response(token, { status });
}
