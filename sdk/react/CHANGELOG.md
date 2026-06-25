# @cookieyes/react

## 0.2.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [8a0a8b0]
  - @cookieyes/core@0.1.1
