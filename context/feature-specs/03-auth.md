Clerk is already installed and connected. Wire it into the Next.js app: provider, auth pages, redirects, route protection, and user menu.

## Design

Use Clerk’s `dark` theme from `@clerk/ui/themes` as the base.

Override Clerk appearance variables using the app’s existing CSS variables. Do not hardcode colors.

### Sign-in and sign-up pages:

- large screens: two-panel layout
- left panel (top to bottom):
  - compact logo + "Jhakri AI" wordmark
  - small uppercase badge pill: `AI-POWERED · REAL-TIME · COLLABORATIVE`
  - large hero heading, with the final word in solid accent color
  - short tagline paragraph
  - feature list: rows of `icon chip + title + one-line description` (icon sits in a soft `brand-dim` rounded chip; the row itself is not a card)
  - muted footer line: `© <year> Jhakri AI`
- right: centered Clerk form with light `appearance.elements` polish — flatten Clerk's default card (no border/shadow) so it sits cleanly on the panel, and tidy the social/submit buttons. Keep Clerk's flow and internals intact; do not restructure the form.
- small screens: form only (left panel hidden)
- no gradients
- no scroll-heavy layouts

Keep the layout professional and cohesive. The left panel may use a hero heading and an illustration, but must stay flat (no gradients) and must not introduce a scroll-heavy marketing page.

## Implementation

Wrap the root layout with `ClerkProvider` using Clerk’s `dark` theme.

Create sign-in and sign-up pages using Clerk components.

Use `proxy.ts` at the project root, not `middleware.ts`.

Define public routes using the existing sign-in and sign-up env vars. Protect everything else by default.

Update `/`:

- authenticated users redirect to `/editor`
- unauthenticated users redirect to `/sign-in`

Add Clerk’s built-in `UserButton` to the editor navbar right section for profile settings and logout.

Keep Clerk’s default user menu and profile flows intact. Do not rebuild or heavily customize Clerk internals.

Use existing Clerk env vars. Do not rename or invent new ones.

## Dependencies

install: @clerk/ui.

## Check When Done

- `proxy.ts` exists at the root
- all routes are protected except public auth paths
- auth pages use CSS variables with no hardcoded colors
- `ClerkProvider` wraps the root layout
- `npm run build` passes