---
"@cookieyes/react": patch
---

Take 1.11 KB of gzip out of the banner, with no visual, behavioural or API change.

**The "Powered by CookieYes" wordmark (786 bytes).** It is an inline SVG of the letterforms, and it arrived from a design tool carrying about fourteen significant digits per coordinate — `5.48703 1.81738C8.08615 3.20915…` — for a mark whose viewBox is 78×13 and which renders at 78 CSS pixels. Every one of those digits is a shipped byte on every page load, in all three components that render the badge. Rounding the path data to two decimals moved the furthest point by 0.005 of a viewBox unit: a two-hundredth of a CSS pixel, under a third of a device pixel even at 3× DPR. The badge is unchanged, still on by default, and there is no new configuration.

Gating the badge behind a config flag was considered first and measured at **zero** saving, which is the point worth recording: a runtime flag cannot remove the bytes, because the icon stays imported and therefore stays in the bundle regardless of what the flag says. Only making the asset smaller — or not shipping it at all, which is a commercial decision and not this change — moves the number. `icon-precision.test.ts` now fails if long decimals come back, because re-exporting the asset restores them, the diff reads as a routine asset update, and nothing about the rendered banner looks different.

Rounding to one decimal was measured too, at a further 0.36 KB. It is not taken here: 0.05px of drift per letter is still invisible, but this is a brand wordmark, and that is the brand owner's call rather than a size decision.

**The builder deprecation warning (325 bytes).** `createCookieYes()`'s deprecation message is now dropped from production bundles by the same `process.env.NODE_ENV` guard `@cookieyes/core` uses, and for the same reason — see that package's changeset for why the guard is written the way it is. Unchanged in development and in tests.

Both figures are from `pnpm size`, which measures the compressed client-JS delta against an empty Next.js app; see `tools/size/README.md`.
