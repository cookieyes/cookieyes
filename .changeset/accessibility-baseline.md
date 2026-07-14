---
"@cookieyes/react": patch
---

Fix keyboard/focus-management and screen-reader gaps in `<CookieBanner />`,
`<CookiePreferences />`, and `<CookieOptOut />`:

- Opening `<CookiePreferences />` or `<CookieOptOut />` now moves focus into
  the dialog automatically; closing it (Save, Cancel, or `Esc`) now returns
  focus to whichever control opened it — including when that control was the
  banner or the recall button, both of which remount when the dialog closes.
- The Preferences category toggles (`role="switch"`) now have a real
  accessible name — previously an `aria-label`-less switch, announced by
  screen readers with no indication of which category it controlled.
- The banner is now announced by screen readers when it first appears, via
  an `aria-live="assertive"` announcer that's rendered independently of the
  banner's own mount/hide cycle and populated after a short delay rather
  than immediately — a live-region update fired right at page-load time
  commonly gets dropped while the screen reader is still announcing the
  navigation itself.
- The banner now portals to the front of `<body>` once mounted (still
  server-rendered inline first, so there's no change to first-paint/CLS
  behavior). Previously it rendered wherever `<CookieYesRoot>` was mounted —
  after the app's own content, per both the docs and the CLI's scaffold —
  which put it last in the page's reading order. A screen-reader or
  keyboard user couldn't reach it without stepping through the entire page
  first; now it's reachable within the first Tab/swipe.
- All entrance/exit animations (banner, dialogs, recall button) now respect
  `prefers-reduced-motion: reduce` — same end state, no motion.
- Adds automated `axe-core` accessibility tests for the banner and both
  dialogs, and documents the keyboard/focus contract and a scoped
  accessibility posture statement in the README.

No public API changes — this is behavior/bug fixes to existing components.
