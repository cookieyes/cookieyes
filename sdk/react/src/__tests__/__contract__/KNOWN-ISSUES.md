# Known issues: fix while we move it

The recordings in this folder show what React does today, including the
things below. They are listed here so the shared UI layer fixes them instead
of copying them, and so nobody reads them as intended behaviour.

## To fix

1. **"Powered by" is hard-coded English.** The branding link in the banner, the
   preferences dialog and the opt-out dialog renders the visible text
   `Powered by` followed by the logo (`components/BrandingLink.tsx`). The
   translation `poweredBy` exists, but it holds the whole phrase including the
   brand name, which the logo already shows. Its accessible name is translated;
   the visible text is not.
2. **The recall button carries `data-pos="bottom-left"`, which does nothing.**
   No stylesheet rule and no setting reads it (`controls/RecallButton.tsx`).
   Either a position setting is added, or the attribute is dropped.
3. **The opt-out checkbox has a fixed id, `cy-ccpa-optout`.** Two opt-out
   dialogs on one page would share it and the second label would point at the
   first checkbox (`presets/CookieOptOut.tsx`).
4. **Some parts of the opt-out dialog and the reload notice have no
   `data-cy-part`,** so they cannot be styled through the part contract like
   everything else: the Cancel button, the checkbox and its label, the
   confirmation message and the branding link in the opt-out dialog, and the
   Reload button in the reload notice. They can only be reached through
   `.cy-*` class names.
5. **The opt-out dialog reads "already opted out" from the `analytics`
   category alone** (`initialOptOutState` in `@cookieyes/ui`). With a custom
   taxonomy that has no `analytics` category, the box always opens ticked. What
   should count as opted out is a consent question for `@cookieyes/core`, so it
   is recorded here rather than changed in the UI layer.

## React-only details, not part of the shared contract

- **`data-cy-entered` on `.cy-banner-wrap`.** React draws the banner in place
  first and then moves it under `<body>`; the attribute stops the entry
  animation from playing twice (`primitives/Banner.tsx`). A framework that
  draws the banner in its final place once does not need it.
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
  match for "widget position" is the unused `data-pos` attribute above.
- Dark mode changes five values (`--cy-bg`, `--cy-text`, `--cy-muted`,
  `--cy-border`, `--cy-widget-bg`), not four.
- The state attribute is `data-cy-state`, not `data-state`.
