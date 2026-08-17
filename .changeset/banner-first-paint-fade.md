---
"@cookieyes/react": patch
---

Fix the banner painting unstyled on first load, and replace its slide-in with a fade

**The banner now looks right on the very first paint.** `cookieyes.css` referenced
`var(--cy-primary)`, `var(--cy-bg)`, `var(--cy-text)` and the rest of the `--cy-*` tokens
without declaring any of them — the values only arrived once `useThemeVars` ran after
hydration. Until then the server-rendered banner painted with a transparent background,
no border radius and the host page's font. The stylesheet now ships `:root` defaults (plus
a `prefers-color-scheme: dark` block, matching the default `colorScheme: "system"`), so the
banner is correctly styled before any JavaScript runs.

Custom themes are unaffected: `useThemeVars` still applies your `theme` config to each
component container via `element.style.setProperty`, which beats a `:root` rule — and it
still uses the CSSOM rather than a generated `<style>` block, so strict `style-src` CSP
support is unchanged.

**The entry animation is now an opacity-only fade.** It was `cy-slide-up` — 0.5s, starting
from `opacity: 0` and `translateY(40px)` — which left the banner effectively invisible for
the first half-second after the page painted, and read as content sliding over the page.
It is now `cy-fade-in 0.2s ease-out`, and the exit animation `cy-fade-out` no longer
translates either. Neither keyframe set touches `transform` or any layout property, so
layout shift stays at zero.

If you were targeting `@keyframes cy-slide-up` or overriding `.cy-banner`'s `animation`
in your own CSS, update it to `cy-fade-in`. `prefers-reduced-motion: reduce` continues to
disable the animation entirely.
