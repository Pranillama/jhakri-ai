# Architecture Context

## Stack

| Layer            | Technology              | Role                                                           |
| ---------------- | ----------------------- | -------------------------------------------------------------- |
| Framework        | Next.js 16 + TypeScript | Full-stack app with server/client boundaries                   |
| UI               | Tailwind + shadcn/ui    | Component composition and styling                              |
| Auth             | Clerk                   | User identity and route protection                             |
| Database         | Prisma + PostgreSQL     | Relational metadata: projects, collaborators, specs, task runs |
| Canvas           | Liveblocks + React Flow | Real-time collaborative canvas, presence, and cursors          |
| Background tasks | Trigger.dev             | Durable AI generation workflows                                |
| Artifact storage | Vercel Blob             | Canvas snapshots and generated Markdown specs                  |

## System Boundaries

- `app/api` — Authenticated request handlers: input validation, ownership checks, task triggering, and persistence.
- `trigger` — Long-running background jobs: AI design generation and spec generation.
- `lib` — Shared infrastructure: Prisma client, access control helpers, and utilities.
- `components` — UI composition: canvas surfaces, sidebars, dialogs, and interactive elements.
- `prisma` — Database schema and generated client output.
- `data` — Legacy local directory. Not used for new artifacts.

## Storage Model

- **Database**: metadata, ownership, relationships, and task run records.
- **Vercel Blob**: generated artifacts — canvas snapshots at `canvas/{projectId}.json` and specs at `specs/{projectId}/{specId}.md`.
- Project records, spec records, and task run records belong in PostgreSQL.
- Canvas content and Markdown output are stored in and retrieved from Vercel Blob.
- The blob URL is stored in the database (`canvasJsonPath`, `filePath`) as the reference to the artifact.

## Auth and Collaboration Model

- Every project has a single owner (Clerk user ID).
- Projects can include additional collaborators.
- Only authenticated users can access protected routes.
- Only the owner or a collaborator can mutate project resources.
- Liveblocks room tokens are issued only after verifying project membership.

## Starter System Designs

- Prebuilt templates are static canvas snapshots stored in the codebase.
- Templates are loaded into the active Liveblocks room when a user imports one.
- Import can occur on canvas creation or from within the editor at any time.
- Template data follows the same node/edge schema as user-created canvas content.
- Templates do not require a separate database record; they are resolved by template ID at import time.

## AI Generation Model

### Design Generation

- Input: user prompt, project context, and current canvas state.
- Execution: durable background task via Trigger.dev, using Gemini through the Vercel AI SDK.
- Output: structured node and edge updates written into the shared Liveblocks room.
- Canvas writes go through `mutateFlow` from `@liveblocks/react-flow/node` — the server-side half of the same collaborative flow API the canvas uses on the client. The task never writes Storage by hand.
- The agent is a visible participant while it runs. It publishes on two Liveblocks channels:
  - **Presence** — ephemeral agent presence (cursor position + `thinking` flag) via `Liveblocks.setPresence`, so it renders through the existing cursor and avatar components with no special-casing.
  - **Feeds** — the shared `ai-status-feed` (see Shared AI Status below), so progress is identical for every participant and survives a reconnect or a mid-run join.
- Everything the model chooses is drawn from a closed set — a shape name, a palette name, a grid cell, a size name. Pixel values, colors, and positions are computed from those names in code, so the documented shape, color, and spacing rules hold by construction rather than by prompt compliance.

### Shared AI Status

- AI activity is shared room state, not per-client state. Background tasks publish one message per status update into a Liveblocks **feed** named `ai-status-feed` — one feed per room, created on the run's first status update and reused thereafter.
- The payload schema lives in `types/tasks.ts` and is task-agnostic (`task`, `state`, optional `text`, `runId`), so spec generation publishes into the same feed rather than opening a second channel.
- Feed messages are untrusted on the read side: every consumer validates before displaying and skips anything that fails.
- Clients read the feed through one hook (`hooks/use-ai-status.ts`), which exposes only the most recent valid message. The canvas status banner and the AI sidebar's composer both render from it, so they can never disagree about what the AI is doing.
- The editor shell — not the canvas — joins the Liveblocks room, because the canvas and the AI sidebar are both participants in it.

### Room Chat

- Collaborative chat is shared room state, delivered through its own Liveblocks **feed** named `ai-chat` — kept separate from `ai-status-feed` so a chat message and an AI status update are never mistaken for each other.
- The `ai-chat` feed has no background task to create it lazily, unlike `ai-status-feed`. It is ensured to exist server-side on every `/api/liveblocks-auth` call (idempotent create, tolerating "already exists"), so the sidebar can always subscribe and send without a race.
- The payload schema lives in `types/tasks.ts` (`chatMessageSchema`): `sender`, `role`, `content`, `timestamp`. Human prompts use the `"user"` role; design-run summaries and failures use the `"assistant"` role.
- Feed messages are untrusted on the read side, same rule as the status feed: every consumer validates before displaying and skips anything that fails.
- Submitting the AI Architect composer publishes the human prompt, starts a design run through `POST /api/ai/design`, and lets the initiating client publish the run's final summary or failure into the feed. Canvas updates still arrive independently through Liveblocks.

### Spec Generation

- Input: current canvas graph and project context.
- Execution: durable background task via Trigger.dev.
- Output: Markdown technical spec saved to Vercel Blob and linked to the project through a database record.

## Invariants

1. Request handlers do not run long-lived AI work — that belongs in background tasks.
2. Metadata and large generated artifacts are stored in separate layers.
3. Auth and ownership are enforced at every mutation boundary.
4. Client components are used only where browser interactivity or real-time state requires them.
5. The canvas schema must remain consistent between user-created content and imported templates.
