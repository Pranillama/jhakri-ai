# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 7: Wire the editor home, sidebar, and project dialogs to the real project API (complete).

## Current Goal

- Build the editor canvas / workspace at `/editor/[projectId]` (Liveblocks + React Flow). Creating a project now navigates there, but the route does not exist yet.

## Completed

- 01-design-system: shadcn/ui configured (radix-nova preset), Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea installed, lucide-react installed, cn() helper in lib/utils.ts, dark-only theme with project CSS variables in globals.css.
- 02-editor: editor chrome components — `components/editor/editor-navbar.tsx` (fixed-height top navbar with sidebar toggle using PanelLeftOpen/PanelLeftClose, empty center/right sections), `components/editor/project-sidebar.tsx` (floating slide-in left sidebar with Projects header + close, My Projects/Shared tabs with empty states, full-width New Project button), and `components/editor/editor-dialog.tsx` (reusable dialog pattern wrapping shadcn Dialog with title/description/footer props).
- 03-auth: Clerk authentication wired and verified (`npm run build` passes) — `@clerk/ui` installed; `ClerkProvider` (dark base theme + CSS-variable appearance overrides + light `elements` polish that flattens Clerk's card) wraps the root layout; `proxy.ts` protects all routes except the public sign-in/sign-up paths (defined via the Clerk sign-in/sign-up URL env vars); two-panel `/sign-in` and `/sign-up` pages; `/` redirects authenticated users to `/editor` and unauthenticated users to `/sign-in`; `UserButton` added to the editor navbar right section.
  - Left auth panel (spec updated in `03-auth.md`): badge pill, large hero heading (solid accent last word), tagline, feature rows (`brand-dim` icon chip + title + description) in `components/auth/auth-shell.tsx`, and a footer line. No gradients, no illustration.
- 04-project-dialogs: editor home screen + project dialogs and sidebar actions (mock data only, no API/persistence; tsc + lint clean). `components/editor/editor-home.tsx` (centered heading/description + `New Project` Plus button, uncarded); `hooks/use-project-dialogs.ts` (owns dialog/form/loading state, no-op submits that just close); `components/editor/project-dialogs.tsx` (Create with live slug preview via `lib/slug.ts`, Rename prefilled + auto-focus + Enter-submits + current name in description, Delete destructive confirm-only; Create/Rename block submit + show an inline error when the name yields an empty slug — slug validation added beyond the original spec); `components/editor/project-sidebar.tsx` rewritten to render `lib/mock-projects.ts` lists, owned-only rename/delete via `components/ui/dropdown-menu.tsx` (kebab, hidden until hover), and a mobile-only backdrop scrim (`md:hidden`) that closes on tap. `types/project.ts` holds the `Project`/`ProjectOwnership` types. `app/editor/page.tsx` wires home + sidebar + dialogs through the shared hook.
- 06-project-apis: backend project REST routes (no UI wiring). `app/api/projects/route.ts` — `GET` lists the authed Clerk user's projects (`ownerId = userId`, newest-first by `createdAt`); `POST` creates a project owned by the user, defaulting a missing/blank `name` to `Untitled Project` and using the schema's cuid id (201). `app/api/projects/[projectId]/route.ts` — `PATCH` renames (400 on empty name) and `DELETE` removes, both owner-gated. `lib/projects.ts` holds the shared `checkProjectOwnership` (returns 404 for missing, 403 for non-owner) and `parseProjectName` (trims/validates the `name` field from unvalidated bodies). Unauthenticated requests return 401 everywhere via Clerk `auth()`. Fixed `lib/prisma.ts`: the singleton now resolves to a single Accelerate-extended client type (pg-adapter branch cast to it) so model methods are callable — the prior union type was uncallable once first consumed. `npm run build` + `eslint` pass.
- 07-wire-editor-home: editor home wired to the real project API (`npm run build` + `eslint` pass). `app/editor/page.tsx` is now a server component that reads the Clerk `userId` (`currentUser()` for the email) and fetches owned + shared lists server-side via new helpers in `lib/projects.ts` (`listOwnedProjects` by `ownerId`; `listSharedProjects` by `ProjectCollaborator.email`, both newest-first, mapped to the `Project` UI type with `ownership`), passing both to the new client shell `components/editor/editor-workspace.tsx` (holds sidebar state + the dialogs hook; the page formerly did this). `hooks/use-project-dialogs.ts` now performs real mutations: Create generates a `<slug>-<suffix>` room ID (suffix fixed on open so the preview matches), `POST`s it as the project `id` and navigates to `/editor/[id]`; Rename `PATCH`es then `router.refresh()`; Delete `DELETE`s then redirects to `/editor` when the deleted project is the open workspace (via `usePathname`) else refreshes — all with an `error` state surfaced inline in the dialogs. `components/editor/project-sidebar.tsx` takes `ownedProjects`/`sharedProjects` props instead of importing mocks; `lib/mock-projects.ts` deleted and `slug` dropped from `types/project.ts` (unused, no DB column). Create dialog now previews the room ID (was slug). To keep the project ID and Liveblocks room ID aligned, `POST /api/projects` accepts an optional client-supplied `id` validated by `parseProjectId` in `lib/projects.ts` (`^[a-z0-9]+(?:-[a-z0-9]+)*$`); a missing/invalid id still falls back to the schema's cuid default.
- 05-prisma: relational data layer (Prisma v7). `prisma/models/project.prisma` (multi-file schema folder via `prisma.config.ts` `schema: "prisma"`) defines the `ProjectStatus` enum (`DRAFT`/`ARCHIVED`), `Project` (cuid id, `ownerId` Clerk user, name, optional description, status default `DRAFT`, optional `canvasJsonPath`, `createdAt`/`updatedAt`; indexes on `ownerId` and `createdAt`), and `ProjectCollaborator` (cascade-delete relation to `Project`, `email`, `createdAt`; `@@unique([projectId, email])`, indexes on `email` and `[projectId, createdAt]`). `lib/prisma.ts` is a cached singleton (cached on `globalThis` outside production) that branches on `DATABASE_URL`: `prisma+postgres://` → `accelerateUrl` + `withAccelerate()` (`@prisma/extension-accelerate` added); otherwise direct `@prisma/adapter-pg` (`PrismaPg`). Generated client at `app/generated/prisma` (gitignored), imported from `@/app/generated/prisma/client`. Initial migration `prisma/migrations/20260623195737_init` applied; `npm run build` passes.

## In Progress

- None.

## Next Up

- Editor canvas / workspace at `/editor/[projectId]`: the Liveblocks + React Flow canvas that opens when a project is created or selected. Create already navigates there; the route is not built yet.

## Open Questions

- Shared-project list keys off the collaborator's email from Clerk's `currentUser()`. No UI exists yet to add collaborators, so the Shared tab is empty in practice until a collaborator-invite flow lands.

## Architecture Decisions

- Project ID == Liveblocks room ID. The create flow generates `<slug>-<suffix>` client-side and sends it as the project `id`; `POST /api/projects` persists it (validated, URL-safe) instead of always using the cuid default, so the DB record and the future room share one identifier. This extends 06's "use the schema's ID strategy" — cuid remains the fallback when no valid id is supplied. `POST` returns 409 on a `P2002` id collision (duplicated/retried create).
- Ownership enforcement is atomic with the write (code-review fix). `PATCH`/`DELETE` no longer pre-check ownership in a separate query (TOCTOU window); they scope the mutation to `where: { id, ownerId }` and catch Prisma `P2025`. On that not-found path, `resolveMutationFailureStatus` in `lib/projects.ts` does a single existence read to pick 403 (exists, other owner) vs 404 (missing). The old `checkProjectOwnership`/`ProjectOwnershipResult` were removed.

## Session Notes

- Add context needed to resume work in the next session.
