# Known issues

The recordings in this folder were first taken from React as it was. This
file lists what was wrong in them, what has been fixed, and what is still
open, so nobody reads a quirk as intended behaviour.

## Fixed while moving to the shared layer

Each fix changed React and `@cookieyes/ui` together, and the recordings were
updated in the same change.

1. **"Powered by" was hard-coded English.** The visible words now come from
   the `poweredBy` translation, split around the brand name the logo shows.
2. **The recall button carried `data-pos="bottom-left"`, which nothing read.**
   Removed.
3. **The opt-out checkbox had a fixed id, `cy-ccpa-optout`,** so two opt-out
   dialogs on one page clashed. The id is now generated.
4. **Some opt-out and reload-notice controls had no `data-cy-part`.** They now
   have `checkbox`, `checkbox-label`, `cancel`, `confirmation` and `branding`
   in the opt-out dialog and `reload` in the reload notice.
5. **Screen-reader-only text used an inline `style` attribute,** which a
   strict `style-src` policy blocks in server-rendered HTML, leaving the
   banner's announcement visible on the page. It now uses the `.cy-sr-only`
   class, which is in `critical.css`.

## Still open

- **The opt-out dialog reads "already opted out" from the `analytics`
  category alone** (`initialOptOutState` in `@cookieyes/ui`). With a custom
  taxonomy that has no `analytics` category, the box always opens ticked. What
  should count as opted out is a consent question for `@cookieyes/core`, so it
  is recorded here rather than changed in the UI layer.

## React-only details, not part of the shared contract

- **`data-cy-entered` on `.cy-banner-wrap`.** It stops the entry animation
  from playing a second time for a banner that was already on screen. React
  sets it when it moves its server-rendered banner under `<body>`
  (`primitives/Banner.tsx`); `@cookieyes/vanilla` sets it when it takes over a
  first-paint banner from `renderShell`. A banner drawn once, in place, does
  not carry it.
- **The `#cookieyes-portal-root` element** is how React moves the banner and
  the recall button to the start of `<body>`. Another framework may place them
  there directly, as long as they are first in the Tab order.

## Intended, though it can look wrong

- **The banner is `aria-modal="true"` with a focus trap, but it does not take
  focus when it appears, and Escape does not close it.** Focus stays on the
  page until the visitor presses Tab, which lands on the banner. Closing the
  banner without a choice is the close button's job.

## Points in the original task description that do not match the code

- There are no "button variant" or "widget position" theme settings. The
  nine settings are listed in `theme.json`, and each one works. The closest
  match for "widget position" was the unused `data-pos` attribute, now removed.
- Dark mode changes five values (`--cy-bg`, `--cy-text`, `--cy-muted`,
  `--cy-border`, `--cy-widget-bg`), not four.
- The state attribute is `data-cy-state`, not `data-state`.
