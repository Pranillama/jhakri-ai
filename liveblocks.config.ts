import type { AiStatusMessage, ChatMessage } from "@/types/tasks";

// Define Liveblocks types for your application
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      // Live cursor position on the canvas, null when off-canvas.
      cursor: { x: number; y: number } | null;
      // Whether this user is currently waiting on an AI generation.
      thinking: boolean;
    };

    // The Storage tree for the room, for useMutation, useStorage, etc.
    // Nothing in this app reads Storage directly: the canvas graph lives under
    // a `flow` key owned and typed by `@liveblocks/react-flow`
    // (`useLiveblocksFlow` on the client, `mutateFlow` on the server), and
    // that package is the source of truth for the subtree's shape.
    Storage: Record<string, never>;

    // Data carried by feed messages, for useFeedMessages. A union because two
    // feeds exist (`ai-status-feed` and `ai-chat`) and each consumer validates
    // with the schema for the feed it actually subscribed to.
    FeedMessageData: AiStatusMessage | ChatMessage;

    // Custom user info attached to the session token when authenticating.
    UserMeta: {
      id: string;
      info: {
        // Display name for cursors, avatars, and presence.
        name: string;
        // Avatar image URL.
        avatar: string;
        // Deterministic cursor color derived from the user ID.
        color: string;
      };
    };

    // Custom events, for useBroadcastEvent, useEventListener
    RoomEvent: Record<string, never>;

    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: Record<string, never>;

    // Custom room info set with resolveRoomsInfo, for useRoomInfo
    RoomInfo: Record<string, never>;
  }
}

export {};
