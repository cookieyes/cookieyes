---
"@cookieyes/core": minor
---

Load the integration runner on demand. It is the largest single subsystem in the package and does nothing unless `integrations` is configured, which most consumers never do. Measured with `pnpm size`: the compressed initial download drops **1.20 KB**, taking `@cookieyes/core` from 8.42 KB to **7.41 KB** over an empty Next.js app.

**This is a deferral, not a deletion, and the size report says so.** `initial` falls by 1.20 KB; `total` rises by 0.42 KB, because the runner now ships as its own chunk plus the machinery to fetch it. Someone who configures integrations downloads slightly more in total, just not before first paint. Both numbers are budgeted separately from now on so a future change cannot look like a saving while only moving bytes around.

**New: `integrationsReady`** on the runtime, a promise that resolves once configured integrations have been loaded and wired up. It resolves immediately when none are configured. This exists because the deferral is observable: for a short window after setup, `getIntegrations()` returns `[]` and no integration has been set up. Making that window awaitable is better than leaving it as a race — the two tests that caught this were asserting against a fixed `setTimeout(0)`, which the chunk load outruns, and a test that guesses a tick count passes or fails on machine speed.

Consent gating is unaffected: an integration cannot run before its category is granted whether or not it has loaded yet. Nothing loads that would not have loaded.

Two things were needed to make this work at all, and both are easy to get wrong:

- `integrations.ts` is now a **separate build entry**. Without that, Rollup flattens the dynamic import back into the main chunk — the barrel in `index.ts` re-exports `runIntegrations`, which keeps the module statically reachable. The first attempt did exactly this and made `dist/index.js` 317 bytes *larger* while emitting no second chunk.
- Core exposes `_loadIntegrations()` (`@internal`) so `@cookieyes/react` can defer the same module without a static import of `runIntegrations`. A dynamic `import("@cookieyes/core")` from the adapter would pull the whole barrel and defeat the split.

`runIntegrations`, `warnOverlappingVendors` and `warnUnknownCategories` remain exported from the package root; nothing is removed from the public API.

One behaviour change to be aware of: the overlapping-vendor and unknown-category warnings are emitted when the chunk arrives rather than during setup, so they appear a tick later in the console.
