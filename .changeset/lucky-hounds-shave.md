---
"@cookieyes/react": minor
---

Take another **0.66 KB** of gzip out of the initial download by loading the custom-theme runtime only when a `theme` is actually configured: banner + preferences + recall goes from 14.92 KB to **14.26 KB** over an empty Next.js app, and the banner alone from 14.37 KB to **13.73 KB**.

**What was shipping, and why it was redundant.** `useThemeVars` called `computeThemeVars` on every render, for every consumer, and wrote all twelve `--cy-*` tokens onto each component container through the CSSOM. But `cookieyes.css` already declares all twelve — the light defaults on `:root`, and the five that differ in dark mode plus `--cy-on-widget-bg` in a `@media (prefers-color-scheme: dark)` block. For the default configuration (no `theme`, `colorScheme: "system"`) the JavaScript was recomputing, at hydration, values the stylesheet had already applied at first paint. That cost every consumer `computeThemeVars`, its CSS-value sanitiser, `relativeLuminance`, `contrastRatio` and `readableTextOn`.

**What changed.** `computeThemeVars` and the WCAG maths behind it moved to `styles/theme-runtime.ts`, reached only through an `import()`. With no `theme`, nothing loads it and the hook writes nothing at all. With a `theme`, `mountRuntime` starts the fetch the moment it sees one — not at the banner's hydration effect — so the load overlaps hydration instead of queueing behind it, and brand colours land when they did before.

An explicit `colorScheme: "light" | "dark"` is the one case the media query gets wrong, because it follows the device and the developer has said not to. That is now handled by a `data-cy-scheme` attribute on the container and two matching rules in the stylesheet (+0.03 KB gzip on `styles.css`), rather than by computing twelve values in JavaScript to override six.

**No behaviour change.** A themed container ends up with byte-identical values to the synchronous path, verified by asserting the full applied map against `computeThemeVars` for light, dark, and an explicit scheme overriding the device preference. The CSSOM write is unchanged, so custom theme colours still work under a strict `style-src` CSP with no `unsafe-inline`/nonce. First paint is untouched: both stylesheets still carry the defaults, and the banner still renders styled before any JavaScript runs.

**`total` rises 0.35 KB while `initial` falls 0.66 KB**, and the budgets in `tools/size/budgets.json` were moved to match in this same change. That is the honest shape of a deferral — a second chunk costs its own module wrapper — and it is why the two figures are budgeted separately. Only `initial` is what a first-time visitor downloads.

Worth recording: a plain `if (!theme) return` inside `useThemeVars` would have saved **nothing**. The static import is what ships the code, so a runtime guard leaves every byte in the bundle. Splitting the module is the only form of this change that moves the number — the same lesson as the integration runner in 0.6.0, and the reason the saving here is quoted from `pnpm size` rather than from reading the diff.
