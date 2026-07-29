import { Liveblocks, LiveblocksError } from "@liveblocks/node";

/**
 * Fixed cursor palette. A user ID is mapped deterministically onto one of these
 * so a given user keeps the same cursor color across every room and session.
 */
const CURSOR_COLORS = [
  "#E57373",
  "#F06292",
  "#BA68C8",
  "#7986CB",
  "#64B5F6",
  "#4DD0E1",
  "#4DB6AC",
  "#81C784",
  "#FFB74D",
  "#FF8A65",
] as const;

/**
 * Deterministically maps a user ID to a consistent color from `CURSOR_COLORS`.
 * Uses an FNV-1a hash so the same ID always yields the same palette entry,
 * independent of process or machine.
 */
export function getUserColor(userId: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  const index = (hash >>> 0) % CURSOR_COLORS.length;
  return CURSOR_COLORS[index];
}

function createLiveblocksClient(): Liveblocks {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;

  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is required but was not set.");
  }

  return new Liveblocks({ secret });
}

const globalForLiveblocks = globalThis as unknown as {
  liveblocks: Liveblocks | undefined;
};

/**
 * Returns the cached `@liveblocks/node` client, creating it on first use. The
 * client is cached on `globalThis` outside production (mirroring the Prisma
 * singleton) so it survives hot reloads and isn't recreated per request.
 * Initialization is lazy so the secret is only required at request time, not at
 * module load or build.
 */
export function getLiveblocks(): Liveblocks {
  const client = globalForLiveblocks.liveblocks ?? createLiveblocksClient();

  if (process.env.NODE_ENV !== "production") {
    globalForLiveblocks.liveblocks = client;
  }

  return client;
}

/**
 * Creates a room feed if it doesn't already exist. Messages can only be added
 * to a feed that exists, so "create or reuse" is a create whose 409 (already
 * exists) is the reuse — the same pattern `AiActivityPublisher` uses for
 * `ai-status-feed`, applied here for feeds that need to exist before a client
 * ever tries to read or write them.
 */
export async function ensureFeed(
  liveblocks: Liveblocks,
  roomId: string,
  feedId: string,
): Promise<void> {
  try {
    await liveblocks.createFeed({ roomId, feedId });
  } catch (error) {
    if (error instanceof LiveblocksError && error.status === 409) {
      return;
    }

    throw error;
  }
}
