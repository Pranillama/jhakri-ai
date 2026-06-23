# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 5: Data layer — Prisma schema, client singleton, and first migration (complete).

## Current Goal

- Wire the editor home + project dialogs (currently mock data via `lib/mock-projects.ts`) to real persistence on the new Prisma layer (API routes + auth/ownership checks), then continue toward the editor canvas/workspace.

## Completed

- 01-design-system: shadcn/ui configured (radix-nova preset), Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea installed, lucide-react installed, cn() helper in lib/utils.ts, dark-only theme with project CSS variables in globals.css.
- 02-editor: editor chrome components — `components/editor/editor-navbar.tsx` (fixed-height top navbar with sidebar toggle using PanelLeftOpen/PanelLeftClose, empty center/right sections), `components/editor/project-sidebar.tsx` (floating slide-in left sidebar with Projects header + close, My Projects/Shared tabs with empty states, full-width New Project button), and `components/editor/editor-dialog.tsx` (reusable dialog pattern wrapping shadcn Dialog with title/description/footer props).
- 03-auth: Clerk authentication wired and verified (`npm run build` passes) — `@clerk/ui` installed; `ClerkProvider` (dark base theme + CSS-variable appearance overrides + light `elements` polish that flattens Clerk's card) wraps the root layout; `proxy.ts` protects all routes except the public sign-in/sign-up paths (defined via the Clerk sign-in/sign-up URL env vars); two-panel `/sign-in` and `/sign-up` pages; `/` redirects authenticated users to `/editor` and unauthenticated users to `/sign-in`; `UserButton` added to the editor navbar right section.
  - Left auth panel (spec updated in `03-auth.md`): badge pill, large hero heading (solid accent last word), tagline, feature rows (`brand-dim` icon chip + title + description) in `components/auth/auth-shell.tsx`, and a footer line. No gradients, no illustration.
- 04-project-dialogs: editor home screen + project dialogs and sidebar actions (mock data only, no API/persistence; tsc + lint clean). `components/editor/editor-home.tsx` (centered heading/description + `New Project` Plus button, uncarded); `hooks/use-project-dialogs.ts` (owns dialog/form/loading state, no-op submits that just close); `components/editor/project-dialogs.tsx` (Create with live slug preview via `lib/slug.ts`, Rename prefilled + auto-focus + Enter-submits + current name in description, Delete destructive confirm-only; Create/Rename block submit + show an inline error when the name yields an empty slug — slug validation added beyond the original spec); `components/editor/project-sidebar.tsx` rewritten to render `lib/mock-projects.ts` lists, owned-only rename/delete via `components/ui/dropdown-menu.tsx` (kebab, hidden until hover), and a mobile-only backdrop scrim (`md:hidden`) that closes on tap. `types/project.ts` holds the `Project`/`ProjectOwnership` types. `app/editor/page.tsx` wires home + sidebar + dialogs through the shared hook.
- 05-prisma: relational data layer (Prisma v7). `prisma/models/project.prisma` (multi-file schema folder via `prisma.config.ts` `schema: "prisma"`) defines the `ProjectStatus` enum (`DRAFT`/`ARCHIVED`), `Project` (cuid id, `ownerId` Clerk user, name, optional description, status default `DRAFT`, optional `canvasJsonPath`, `createdAt`/`updatedAt`; indexes on `ownerId` and `createdAt`), and `ProjectCollaborator` (cascade-delete relation to `Project`, `email`, `createdAt`; `@@unique([projectId, email])`, indexes on `email` and `[projectId, createdAt]`). `lib/prisma.ts` is a cached singleton (cached on `globalThis` outside production) that branches on `DATABASE_URL`: `prisma+postgres://` → `accelerateUrl` + `withAccelerate()` (`@prisma/extension-accelerate` added); otherwise direct `@prisma/adapter-pg` (`PrismaPg`). Generated client at `app/generated/prisma` (gitignored), imported from `@/app/generated/prisma/client`. Initial migration `prisma/migrations/20260623195737_init` applied; `npm run build` passes.

## In Progress

- None.

## Next Up

- Wire the editor home + project dialogs (currently mock data via `lib/mock-projects.ts`) to real persistence backed by the new Prisma layer (API routes + ownership checks).
- Editor canvas / workspace feature: the React Flow canvas that opens when a project is selected remains a separate feature.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Add decisions that affect the system design or data model.

## Session Notes

- Add context needed to resume work in the next session.
