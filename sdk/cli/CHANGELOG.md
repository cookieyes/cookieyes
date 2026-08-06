# @cookieyes/cli

## 0.3.0

### Minor Changes

- 3332f0d: Add a GitHub star nudge to `init`. Every `npx @cookieyes/cli init` run now prints a short, non-intrusive note before the final summary inviting developers to star the repo at https://github.com/cookieyes/cookieyes.

## 0.2.1

### Patch Changes

- 9ce2fad: Update runtime dependency `@clack/prompts` from 1.5.0 to 1.7.0.

## 0.2.0

### Minor Changes

- 10c922e: Add `mode: "cookie-only"` as the clearer, self-explanatory replacement for `mode: "offline"`.

  Both values behave identically today. `"offline"` is now marked `@deprecated` in
  TypeScript (shows as struck-through in editor autocomplete) and logs a one-time,
  per-page-load console warning pointing to `"cookie-only"`. `"offline"` will be
  removed 3 releases from now; there is no urgency to migrate today, but new
  code and docs should use `"cookie-only"`.

  The CLI (`@cookieyes/cli init`) now scaffolds new projects with `"cookie-only"`
  by default.

  ```diff
   createCookieYes()
  -  .mode("offline")
  +  .mode("cookie-only")
     .mount();
  ```

- 8fdea17: Standardize the configuration API across packages with a single canonical
  `CookieYesConfig` object and one setup function, `initCookieYes(config)`.

  - **`initCookieYes(config)`** is the new setup entry point in `@cookieyes/core`,
    `@cookieyes/react`, and `@cookieyes/nextjs`. A config object is copy-pasteable
    between packages with zero edits.
  - **`CookieYesConfig`** (exported from core, re-exported everywhere) is a flat,
    strictly-typed discriminated union on `mode` — backend keys under
    `mode: "offline"` are now a compile-time error.
  - **`regulation`** is a top-level key everywhere. The nested
    `overrides.regulation` still works (deprecated) and maps to it.
  - **`apiUrl`** replaces `backendURL` as the canonical self-hosted key;
    `backendURL` still works (deprecated) and maps to it.
  - The **`createCookieYes()` builder is deprecated** in favour of
    `initCookieYes`. It keeps working and emits a one-time console warning; it
    will be removed after three release cycles.
  - Non-breaking: the builder, `overrides.regulation`, and `backendURL` all keep
    working through the deprecation window. `ConsentRuntimeOptions` is retained as
    a deprecated alias of `CookieYesConfig`.
  - The `@cookieyes/cli` `init` command now scaffolds `initCookieYes({...})` and
    top-level `regulation`, so fresh projects don't hit the deprecation warnings.

### Patch Changes

- 8a9ea78: Fix the banner, dialogs, and theme colors breaking under a strict
  `style-src` Content Security Policy (e.g. `style-src 'self'`, with no
  `unsafe-inline` and no nonce):

  - The static stylesheet is now a real file, exposed as
    `@cookieyes/react/styles.css` — import it once per app. It no longer
    gets auto-injected as a `<style>` block, which is what a strict CSP
    blocked.
  - Theme colors from `.theme(...)` are applied via `element.style.setProperty(...)`
    instead of a generated `<style>` block, so custom colors and dark/light
    mode keep working under any `style-src` policy, with no nonce needed.
  - If some other style on the page is still blocked, a console warning
    now explains what happened instead of failing silently.
  - The CLI's scaffolded projects (`react` and `nextjs` flows) now include
    the required stylesheet import.

  **Action required:** add `import "@cookieyes/react/styles.css";` once in
  your app (wherever you mount `<CookieYesRoot />`) — without it, the
  banner and dialogs render unstyled.

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
