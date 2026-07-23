# @cookieyes/translations

## 0.2.0

### Minor Changes

- 8de8b3c: Stop tracking safely when consent is withdrawn — without reloading the page.

  Revoking consent no longer needs a full page reload to take effect (and
  `reloadOnRevoke` stays off by default). Instead:

  - **`integrations`** — call a vendor's own documented stop API on revoke and
    resume it on re-accept. Built in: `meta` (`fbq('consent','revoke'|'grant')`)
    stops cleanly; `tiktok`, `linkedin`, `hotjar`, and `segment` have no
    confidently-documented runtime stop and are modelled as reload-only (see the
    vendor audit in the core README). (Google Analytics/Tag Manager are governed
    by the automatic Google Consent Mode v2 broadcast — no integration entry.)
  - **`customStopHandlers`** — register stop instructions for your own scripts;
    a script with no clean stop is marked `needsReload` so revoking it prompts a
    reload instead of silently continuing to track.
  - **`navigator.sendBeacon`** is now intercepted by the network blocker, in
    addition to `fetch`/`XMLHttpRequest` — this is how GA4/Meta fire exit/unload
    tracking, which was previously missed.
  - **`<ReloadNotice />`** (React) — a dismissible, `role="alert"` prompt shown
    only when a revoked tool can be fully stopped only by reloading. It never
    reloads on its own; wording is translatable (`reloadNotice.*`). Read the
    state directly with `useReloadNotice()` for a custom notice.

  All additive — existing integrations keep working unchanged.

### Patch Changes

- 364051f: Overhaul all five package READMEs onto one consistent house template (DEVP-3).

  - **Consistent structure** across core/react/nextjs/translations/cli: hero + tagline, live
    shields.io badges, key features, prerequisites, numbered quick start (all four package
    managers), inline API reference, troubleshooting, and a shared community/support/contributing/
    security footer.
  - **CLI README rewritten** to best-in-class depth: why-vs-manual, the `init` command, global
    flags, a step-by-step expected-output transcript, what-happens-next, and a "no telemetry" note.
  - **Troubleshooting** added to every package (top-3 failure modes each).
  - **Accuracy fixes:** attribution note moved near the top of react/nextjs; pnpm/yarn/bun install
    added to translations; core links to the react/nextjs adapters; regulation coverage stated as
    GDPR + CCPA (the engine does not implement LGPD/TCF); `mode: "offline"` explained in plain
    English. All setup examples use the canonical `initCookieYes(config)` API.
  - **CLI:** the post-`init` docs link now points to the GitHub README until the docs site is live.

  Docs and README-facing strings only; no behavioral logic changed.

## 0.1.1

### Patch Changes

- 8a0a8b0: Faster, smaller-footprint, deterministic banner + first-party minified bundles.

  - **Server-rendered banner (first-byte paint):** `<CookieBanner />` is now present in
    server-rendered HTML and on every load instead of waiting for client hydration. The
    runtime's server snapshot is regulation-aware so GDPR/CCPA markup hydrates without
    mismatch.
  - **Smaller measured footprint:** the full-screen positioning wrapper is now
    `display: contents` (generates no box); fixed positioning and the canonical
    `data-cky-banner` + `role="dialog"` move onto the visible `.cy-banner` card, so the
    banner's reported bounding box equals what the user sees. `Banner.Root` no longer emits
    a default `role` (pass it via props if needed).
  - **Stable selector contract:** `[data-cky-banner]`, `.cy-banner`, `.cy-banner-wrap` are
    now documented, regression-tested public selectors.
  - **Zero layout shift / no load-time network:** the banner uses fixed positioning with a
    transform-only entry animation (CLS 0); offline mode makes no network request on load
    and self-hosted mode only POSTs consent on the user's accept/reject/save.
  - **Build:** migrated from `tsup` to **Rollup**, emitting minified first-party ESM + CJS +
    type declarations with no external runtime URLs. Public APIs and the visual design are
    unchanged.

- Updated dependencies [8a0a8b0]
  - @cookieyes/core@0.1.1
