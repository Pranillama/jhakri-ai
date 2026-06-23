# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 4: Editor home & project dialogs (UI only, mock data)

## Current Goal

- Begin the next feature: editor canvas/workspace (replace the editor-home placeholder with the real React Flow canvas once a project is opened).

## Completed

- 01-design-system: shadcn/ui configured (radix-nova preset), Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea installed, lucide-react installed, cn() helper in lib/utils.ts, dark-only theme with project CSS variables in globals.css.
- 02-editor: editor chrome components — `components/editor/editor-navbar.tsx` (fixed-height top navbar with sidebar toggle using PanelLeftOpen/PanelLeftClose, empty center/right sections), `components/editor/project-sidebar.tsx` (floating slide-in left sidebar with Projects header + close, My Projects/Shared tabs with empty states, full-width New Project button), and `components/editor/editor-dialog.tsx` (reusable dialog pattern wrapping shadcn Dialog with title/description/footer props).
- 03-auth: Clerk authentication wired and verified (`npm run build` passes) — `@clerk/ui` installed; `ClerkProvider` (dark base theme + CSS-variable appearance overrides + light `elements` polish that flattens Clerk's card) wraps the root layout; `proxy.ts` protects all routes except the public sign-in/sign-up paths (defined via the Clerk sign-in/sign-up URL env vars); two-panel `/sign-in` and `/sign-up` pages; `/` redirects authenticated users to `/editor` and unauthenticated users to `/sign-in`; `UserButton` added to the editor navbar right section.
  - Left auth panel (spec updated in `03-auth.md`): badge pill, large hero heading (solid accent last word), tagline, feature rows (`brand-dim` icon chip + title + description) in `components/auth/auth-shell.tsx`, and a footer line. No gradients, no illustration.
- 04-project-dialogs: editor home screen + project dialogs and sidebar actions (mock data only, no API/persistence; tsc + lint clean). `components/editor/editor-home.tsx` (centered heading/description + `New Project` Plus button, uncarded); `hooks/use-project-dialogs.ts` (owns dialog/form/loading state, no-op submits that just close); `components/editor/project-dialogs.tsx` (Create with live slug preview via `lib/slug.ts`, Rename prefilled + auto-focus + Enter-submits + current name in description, Delete destructive confirm-only; Create/Rename block submit + show an inline error when the name yields an empty slug — slug validation added beyond the original spec); `components/editor/project-sidebar.tsx` rewritten to render `lib/mock-projects.ts` lists, owned-only rename/delete via `components/ui/dropdown-menu.tsx` (kebab, hidden until hover), and a mobile-only backdrop scrim (`md:hidden`) that closes on tap. `types/project.ts` holds the `Project`/`ProjectOwnership` types. `app/editor/page.tsx` wires home + sidebar + dialogs through the shared hook.

## In Progress

- None.

## Next Up

- Next feature spec (editor canvas / workspace). `app/editor/page.tsx` now hosts the editor chrome + home screen + project dialogs; the React Flow canvas that opens when a project is selected remains a separate feature.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Add decisions that affect the system design or data model.

## Session Notes

- Add context needed to resume work in the next session.
