---
"@cookieyes/react": minor
---

Per-part styling for the presets. `CookieBanner`, `CookiePreferences`, and `CookieOptOut` now accept `classNames` / `styles` maps — typed to the part names (`BannerPart` / `DialogPart` / `OptOutPart`) so they autocomplete — alongside the existing `className` / `style` for the card. A `styles` value is inline, so it always wins; a `classNames` value competes like any class.

Every interactive part is styleable by state: `data-cy-part` with native `:hover` / `:focus-visible` / `:disabled`, plus `data-cy-state="on" | "off"` for a checked toggle. The `--cy-*` design tokens are documented as a supported reference, with recipes for brand colour, dark mode, matching a design system, and styling a checked toggle. Our styles stay low-specificity and isolated so a stray global rule in your app won't accidentally reshape the banner.
