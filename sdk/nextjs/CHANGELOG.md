# @cookieyes/nextjs

## 0.4.0

### Minor Changes

- 0989acc: Add a consent event API for reacting to consent changes.

  - Core: `consentStore.on("save" | "change", listener, { category? })` returning an unsubscribe function.
  - React / Next.js: the `useOnConsentChange(type, listener, options?)` hook (cleans up on unmount, no-op during SSR).

  `change` fires only when a category actually differs; `save` fires on every save. Listeners fire once immediately with the current state (`isInitial: true`), and one throwing listener never blocks the others. Existing `subscribe`/`subscribeToConsentChanges`/`onConsentUpdate` continue to work unchanged.

- 1a7ee5d: Translations for custom UIs, with live language switching.

  - `useTranslations()` now re-renders when the language changes (previously fixed at setup).
  - New `useLanguage()` hook: read the active language, its reading direction (`ltr`/`rtl`), the loaded languages, and switch language live with `setLanguage(tag)` — no page reload.
  - Framework-less: `consentStore` now carries `translations`, `getLanguageInfo()`, `setLanguage()`, `getCategoryText()`, and `categories` (the resolved taxonomy in effect), and `subscribe` fires on a language switch — so a vanilla custom UI can switch language and follow whatever taxonomy is configured.
  - Languages in `i18n.messages` can be **partial**; any missing text falls back to English.
  - Custom categories are translatable through the same `i18n.messages`, keyed by category id; a translation overrides the category's config label per language.
  - New `i18n.loadLanguage(tag)` to load a language on demand (import it or fetch from your own URL) instead of bundling every language upfront.
  - Core helpers `mergeTranslations`, `getTextDirection`, `pickLanguage` are exported for non-React use.

  The starting language is resolved per page load (explicit `locale` → browser → English); the visitor's choice isn't persisted by the SDK.

- 498b067: Make the components easy to restyle.

  - Every component labels its pieces with `data-cy-part` (and toggles with `data-cy-state="on" | "off"`) for precise CSS targeting. The names are also exported as the typed `CY_PART` / `CY_STATE` constants.
  - The styled presets (`CookieBanner`, `CookiePreferences`, `CookieOptOut`) now accept `className` / `style`, merged onto their visible card on top of the defaults.
  - Control primitives accept `asChild` — render your own element and the SDK wires its behaviour (click action, `data-cy-part`, ref) onto it, composing with your own handlers/classes.

  Purely additive — existing setups render identically.

### Patch Changes

- Updated dependencies [0989acc]
- Updated dependencies [1a7ee5d]
- Updated dependencies [498b067]
  - @cookieyes/core@0.3.0
  - @cookieyes/react@0.4.0

## 0.3.0

### Minor Changes

- 18bec21: Make consent categories configurable, and broadcast Google Consent Mode v2 automatically.

  **Configurable categories.** Define your own taxonomy instead of the built-in
  five via `categories` (core config / `getOrCreateConsentRuntime`) or
  `.categories([...])` (React builder). Each `CategoryDef` has a stable `id`, an
  explicit `required` flag (the always-on category is marked here, never inferred
  from the name `necessary`, so you can rename it freely), optional
  `label`/`description`, and an optional `gcm` mapping. Omit `categories` entirely
  and you get the built-in five, unchanged. Invalid config (empty, duplicate ids,
  ids containing `,`/`:` or colliding with reserved cookie keys, or no `required`
  category) logs a warning and safely falls back to the five. The preferences UI
  now renders whatever taxonomy is in effect.

  **Upgrade-safe taxonomy changes.** Consent records are stamped with a taxonomy
  signature (`taxonomyHash` on the snapshot, `tax:` in the cookie). A returning
  visitor's consent is reused while the signature is unchanged; if you change the
  taxonomy the SDK **re-requests** consent rather than silently applying a
  mismatched record. Legacy cookies with no stamp are honoured as the built-in
  five, so upgrading the SDK never resets existing visitors.

  **Google Consent Mode v2 broadcast.** When a `dataLayer` is present, the SDK now
  broadcasts all seven Consent Mode signals — on load and on every consent change,
  for every visitor — derived from each category's `gcm` mapping. Google Analytics
  4 and Google Tag Manager are governed by this automatically and **no longer need
  an `integrations` entry** — the `ga4` and `gtm` built-in integrations have been
  removed (use the automatic broadcast; set your deny-by-default state in your
  gtag snippet as before). `meta` and the reload-only vendors are unchanged.

  New exports: `resolveCategories`, `DEFAULT_CATEGORIES`, `broadcastGoogleConsent`,
  `computeGoogleConsent`, types `CategoryDef` / `ResolvedCategories` /
  `GoogleConsentSignal` (core, re-exported from React), and the `useCategories()`
  hook (React). The core README documents configurable categories and Consent Mode
  v2 mapping.

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

- e43f502: Gate consent-driven content on committed decisions, not live toggles.

  Scripts, embeds, and the network blocker now react only to a saved decision
  (Accept All / Reject All / Save Preferences), not to an in-progress switch in
  the open preferences dialog — so nothing loads before the visitor actually
  consents. Once loaded, gated content stays until the next page load rather than
  being torn down live on revoke (matching hosted CookieYes).

  - `useConsentCategory` and the store's `has()` now read committed consent; the
    new `committedConsents` (store) / `committedCategories` (manager) expose it.
    `consents` / `categories` stay live to drive the dialog checkboxes.
  - `GatedFrame` latches once shown; an injected `GatedScript` is no longer removed
    on revoke — re-blocking applies on the next page load.

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

- 2971d7d: Document one recommended way to read consent per platform — `useConsent()`
  for React, `consentStore.subscribe` for core/non-React — and move the other
  seven near-equivalent APIs into a clearly labeled "Low-level / advanced API"
  section in each README, each documented with the specific situation it's for.

  Adds a shared decision tree (`docs/which-api-should-i-use.md`) referenced by
  every package's README instead of being copy-pasted, plus short in-editor
  JSDoc pointers on the low-level exports toward the recommended primary API.

  No behavior change — all existing APIs continue to work exactly as before.
  This is a documentation and guidance change only.

- Updated dependencies [19fe0ac]
- Updated dependencies [18bec21]
- Updated dependencies [8a9ea78]
- Updated dependencies [e43f502]
- Updated dependencies [364051f]
- Updated dependencies [10c922e]
- Updated dependencies [8de8b3c]
- Updated dependencies [2971d7d]
- Updated dependencies [8fdea17]
  - @cookieyes/react@0.3.0
  - @cookieyes/core@0.2.0

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
  - @cookieyes/react@0.2.0
  - @cookieyes/core@0.1.1
