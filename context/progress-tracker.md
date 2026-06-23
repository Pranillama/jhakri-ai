# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 3: Authentication

## Current Goal

- Wire Clerk into the app per `03-auth.md`: ClerkProvider with dark theme, sign-in/sign-up pages, `proxy.ts` route protection, `/` redirects, and the `UserButton` in the editor navbar.

## Completed

- 01-design-system: shadcn/ui configured (radix-nova preset), Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea installed, lucide-react installed, cn() helper in lib/utils.ts, dark-only theme with project CSS variables in globals.css.
- 02-editor: editor chrome components — `components/editor/editor-navbar.tsx` (fixed-height top navbar with sidebar toggle using PanelLeftOpen/PanelLeftClose, empty center/right sections), `components/editor/project-sidebar.tsx` (floating slide-in left sidebar with Projects header + close, My Projects/Shared tabs with empty states, full-width New Project button), and `components/editor/editor-dialog.tsx` (reusable dialog pattern wrapping shadcn Dialog with title/description/footer props).

## In Progress

- 03-auth: Wiring Clerk authentication — `@clerk/ui` installed; `ClerkProvider` (dark base theme + CSS-variable appearance overrides + light `elements` polish that flattens Clerk's card) wraps the root layout; `proxy.ts` protects all routes except the public sign-in/sign-up paths (defined via the Clerk sign-in/sign-up URL env vars); two-panel `/sign-in` and `/sign-up` pages; `/` redirects authenticated users to `/editor` and unauthenticated users to `/sign-in`; `UserButton` added to the editor navbar right section.
  - Left auth panel redesigned (spec updated in `03-auth.md`): badge pill, large hero heading (solid accent last word), tagline, feature rows (`brand-dim` icon chip + title + description) in `components/auth/auth-shell.tsx`, and a footer line. No gradients, no illustration.

## Next Up

- Next feature spec (editor page wiring / canvas). A minimal `app/editor/page.tsx` exists only as the auth redirect target hosting the existing editor chrome; the full editor/canvas wiring remains a separate feature.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Add decisions that affect the system design or data model.

## Session Notes

- Add context needed to resume work in the next session.
