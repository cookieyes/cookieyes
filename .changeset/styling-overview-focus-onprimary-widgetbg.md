---
"@cookieyes/core": minor
"@cookieyes/react": minor
---

Explicit theme colors now survive dark mode, and three new styling tokens.

**Behaviour change.** `backgroundColor`, `textColor`, `mutedTextColor` and `borderColor` were
previously discarded whenever dark mode was active — the SDK's dark palette overwrote them
unconditionally, and there was no way to set a dark-mode value at all. They are now respected in
both color schemes. If you set any of those four *and* relied on dark mode replacing them, your
banner will render differently after this release; remove the setting to get the old dark palette
back.

**New tokens.** A dedicated focus-ring token (`--cy-focus` / `theme.focusColor`) so the keyboard
focus indicator can be set independently of the brand color; a configurable, dark-mode-aware
background for the floating recall widget (`--cy-widget-bg` / `theme.widgetBackgroundColor`); and
two derived readable-text tokens (`--cy-on-primary`, `--cy-on-widget-bg`) so a brand color set
without a matching foreground still produces legible text rather than white-on-white.

All new tokens default to values that reproduce today's rendering exactly.
