# @cookieyes/core

## 0.5.0

### Minor Changes

- e2baba4: Remove three configuration options that were declared in the public types but read by nothing: `consentCategories`, `theme.buttonVariant`, and `theme.widgetPosition`.

  None of the three ever had any effect. `consentCategories` was copied into the normalized config and then never consulted; `buttonVariant` and `widgetPosition` appeared only in the `ThemeConfig` declaration — no component, hook, or stylesheet rule read either. Because they were inert, **removing them changes no runtime behaviour**: code that set them behaved exactly as code that omitted them.

  TypeScript users who passed any of the three will now see a type error. The fix is to delete the property — there is no replacement, because there was never an implementation. For the two theme fields, the styling you may have been attempting is available through the `cy-*` classes and `--cy-*` custom properties; see the styling documentation.

  Also removes a dead `.cy-widget[data-pos="bottom-right"]` rule from the stylesheet. `RecallButton` always emits `data-pos="bottom-left"`, so the rule could never match. The recall widget's position is unchanged (bottom-left) and remains non-configurable.

- e2baba4: Remove the `strategy` prop from `<GatedScript />` and the matching `strategy` field from `ScriptEntry`.

  The prop accepted `"afterConsent" | "lazyOnce"` and was passed all the way through `registerScript` into the script registry — where nothing ever read it. Both values produced identical behaviour: the script is injected once its category is granted, and injection happens the same way regardless. There was no lazy path.

  Because the two values were indistinguishable at runtime, **removing the prop changes no behaviour**. Code that set either value behaved exactly as code that set neither. TypeScript users passing `strategy` will now see a type error; the fix is to delete the prop.

  If you need a genuine loading distinction — load immediately versus only after consent, and what happens when consent is withdrawn — that is what the `integrations` config option and the `@cookieyes/scripts` presets provide.

- e2baba4: Explicit theme colors now survive dark mode, and three new styling tokens.

  **Behaviour change.** `backgroundColor`, `textColor`, `mutedTextColor` and `borderColor` were
  previously discarded whenever dark mode was active — the SDK's dark palette overwrote them
  unconditionally, and there was no way to set a dark-mode value at all. They are now respected in
  both color schemes. If you set any of those four _and_ relied on dark mode replacing them, your
  banner will render differently after this release; remove the setting to get the old dark palette
  back.

  **New tokens.** A dedicated focus-ring token (`--cy-focus` / `theme.focusColor`) so the keyboard
  focus indicator can be set independently of the brand color; a configurable, dark-mode-aware
  background for the floating recall widget (`--cy-widget-bg` / `theme.widgetBackgroundColor`); and
  two derived readable-text tokens (`--cy-on-primary`, `--cy-on-widget-bg`) so a brand color set
  without a matching foreground still produces legible text rather than white-on-white.

  All new tokens default to values that reproduce today's rendering exactly.

- e2baba4: Make nine previously hardcoded English strings translatable. Until now a fully translated site still announced these in English to screen reader users, and showed English text inside an otherwise translated interface.

  The strings are: the visible "Always Active" label shown on a required category; the accessible names of the preferences dialog, the opt-out dialog and the floating recall button; both pieces of `<GatedFrame />`'s blocked-content placeholder; and the accessible names of the three close buttons — on the banner (rendered under CCPA), the preferences dialog and the opt-out dialog.

  The close buttons were the most consequential of the nine. Each renders only an `aria-hidden` icon, so the hardcoded English label was the button's entire accessible name — on a fully translated site, a screen reader still announced "Close".

  Nine keys are added to `TranslationMap` — `alwaysActive`, `preferencesDialogLabel`, `optOutDialogLabel`, `recallButtonLabel`, `bannerCloseLabel`, `preferencesCloseLabel`, `optOutCloseLabel`, and a `gatedFrame` group holding `placeholder` and `action` — and all five shipped languages (English, German, Spanish, French, Italian) supply them. `gatedFrame.placeholder` substitutes `{category}`, following the same placeholder convention as `optOut.successCountdown`'s `{seconds}`.

  The recall button's tooltip was a second, separate hardcoded copy of its label; it now reads the same key.

  Because the keys are required on `TranslationMap`, every shipped language must supply them — a missing translation is a build error rather than a silent English fallback. If you declare a full `TranslationMap` of your own you will need to add the nine keys; if you pass a partial object to `i18n.messages` (the usual case) nothing changes, and anything you omit still falls back to English.

### Patch Changes

- ae888a9: Give every documentation link a working destination.

  Three deprecation warnings previously gave a reader nowhere useful to go: the `mode: "offline"` rename and the `builtInIntegrations` warning carried no link at all, and the builder deprecation pointed at a raw Markdown file in the GitHub repository. All three now link to the [migration guide](https://github.com/cookieyes/cookieyes/blob/main/apps/web/content/docs/migration.mdx).

  The package READMEs linked to a repository copy of the "Which API should I use?" decision tree that had drifted out of date — it still told Next.js users to read server-side consent with `parseCookie()` from `@cookieyes/core`, when the correct API is `getServerConsent()` from `@cookieyes/nextjs/server`. Every README now links to the maintained copy, and the older repository copy is a pointer rather than a second source of truth.

  Links point at the documentation sources in this repository. They will move to the documentation site once it is published.

  Documentation links only; no behaviour or API changes.

- e2baba4: State a concrete removal timeline everywhere a deprecation promises one.

  The `builtInIntegrations` warning said "a future release" while the other two warnings committed to three release cycles. Every deprecation now says "after three release cycles" — the runtime warnings _and_ the `@deprecated` TSDoc on `mode: "offline"` and `builtInIntegrations`, which is what shows in an editor hover tooltip and had been left saying "a future release". Message and doc-comment text only — no behaviour change.

- e2baba4: `resetConsentRuntime()` now un-patches `fetch`, `XMLHttpRequest` and `navigator.sendBeacon` before dropping the runtime.

  The network blocker is a module-level singleton, and installing a second one while the first is active is a deliberate no-op. Because `resetConsentRuntime()` cleared the runtime without uninstalling the blocker, an application that reset and re-initialised was left in a state that looked correct and was not: the previously patched transports stayed in place, still consulting the **old** manager's committed-consent closure, while the new `initCookieYes()` call's `networkBlocker` rules were silently discarded. Nothing was logged.

  Only `@cookieyes/test`'s `resetConsentTestState()` uninstalled the blocker, so test suites were unaffected — this reached applications that call the public `resetConsentRuntime()` themselves, for example when tearing down and rebuilding consent on a route change.

  The uninstall is idempotent, so calling it when nothing was installed remains a no-op, and `resetConsentTestState()`'s existing uninstall-first ordering is unchanged.

## 0.4.0

### Minor Changes

- f4e54aa: Add optional region-based regulation (geo-detection).

  - New `region` config: `detect` (return the visitor's region synchronously), `map` (region → regulation, you own it), `honorGpc` (default true), and `strictest` (default `GDPR`).
  - Resolution rules: which banner shows is geo only — a detected region maps to your regulation; unknown/failed detection falls back to the strictest (a required banner is never skipped); a manual `regulation` always wins (with a dev warning).
  - GPC: the browser's "do not sell" signal never changes which banner shows. On a CCPA banner it starts the visitor opted out — non-required categories denied, so gated scripts/iframes don't run — until they explicitly choose otherwise. Applied client-side; set `honorGpc: false` to ignore it.
  - New `<CookieYesProvider region={…}>` (React/Next.js): supplies the regulation per request through context, so a Server Component tree renders the correct banner on the server for each visitor (no post-hydration correction). Optional and additive — without it, the hooks read the runtime as before. Pass the same `region` config you give `initCookieYes`.
  - New `useRegion()` hook (React) and `consentStore.getRegion()` (core) expose the decision: `region`, `regulation`, `source` (`"manual" | "detected" | "strictest"`), `confidence`. `useRegion()`/`useRegulation()` read the provider when present. `useRegulation()` is unchanged in shape.
  - `region.debug: true` logs the resolved decision to the console at setup — a quick check without writing component code.
  - Self-hosted: the detected `region` is included on the consent-log payload.
  - New `regionFromHeaders(headers, { header? })` reads the visitor's region from request headers on the server (defaults to the Vercel/Cloudflare headers, or a custom one) — feed it to `region.detect`. Works with Next.js `headers()` or any framework.

  Fully optional and off by default — omit `region` and nothing changes.

- 73bd445: Add consent-gated third-party integrations.

  - New **`@cookieyes/scripts`** package with ready-made presets — Segment, Meta Pixel, and Google (GA4, Ads, and Tag Manager via Consent Mode) — plus a `customScript` helper for any other tag. Pass them to the `integrations` config: `initCookieYes({ integrations: [segment({ writeKey })] })`. Google products share one `gtag.js`/dataLayer, so `ga4()` + `googleAds()` compose without loading the library twice.
  - For Google, **`@cookieyes/nextjs/server`** exports `<GoogleConsentMode />` — the deny-by-default snippet for the page `<head>` (also available as `googleConsentModeSnippet()` / `bootstrapGoogleConsentMode()` for non-Next apps), so a returning visitor's saved choice applies from first paint.
  - New generic integration engine in core. Each integration declares two things: `load` (`"immediately"` | `"afterConsent"`) and `onRevoke` (`"keep"` | `"remove"` | `"silence"`). The runtime loads it once its category is granted (or immediately for Google Consent Mode), and removes or silences it on withdrawal — reconciling on every consent change.
  - **Breaking rename.** The old `integrations` field — built-in vendor stop-handlers such as `{ vendor: "meta" }` — is **renamed to `builtInIntegrations`**, because the `integrations` name now takes the new presets. **Existing `integrations: [{ vendor: … }]` code will no longer work** as written — move those entries to `builtInIntegrations`. That field keeps working but is deprecated (logs a warning) and will be removed in a future release. If an old `{ vendor }` entry is left in `integrations`, the SDK skips it with a targeted warning pointing to `builtInIntegrations`, rather than failing silently.
  - The SDK warns if the same vendor is configured in both `integrations` and `builtInIntegrations`, which would load it twice (e.g. a double-counted Meta pixel).

- b436f2c: Returning visitors no longer see the banner flash before it disappears

  The server had no way to know whether a visitor had already chosen, so it sent banner markup to
  everyone and the client removed it after hydration. A returning visitor watched the banner appear
  and then vanish, which reads as a bug rather than as a remembered choice.

  Three additions let the server know:

  **`readServerConsent(cookieHeader, options?)`** — new in `@cookieyes/core`. Reads a stored decision
  from a request's `Cookie` header with no `document` and no browser APIs, so it works in any SSR
  framework:

  ```ts
  const initialConsent = readServerConsent(
    request.headers.get("cookie") ?? "",
    config
  );
  ```

  **`<CookieYesProvider initialConsent={…}>`** — new prop in `@cookieyes/react`. Given a decision, the
  banner is never rendered: absent from the HTML rather than present-then-removed, so there is nothing
  to flash.

  **`getServerConsent(options?)`** — new in `@cookieyes/nextjs`, from the `@cookieyes/nextjs/server`
  subpath. Reads `cookies()` for you in the App Router:

  ```tsx
  import { CookieYesProvider } from "@cookieyes/nextjs";
  import { getServerConsent } from "@cookieyes/nextjs/server";

  export default async function RootLayout({ children }) {
    const initialConsent = await getServerConsent({ regulation: "GDPR" });
    return (
      <CookieYesProvider regulation="GDPR" initialConsent={initialConsent}>
        {children}
      </CookieYesProvider>
    );
  }
  ```

  It lives on a separate subpath because it imports `next/headers` and must stay server-only — the
  main `@cookieyes/nextjs` entry is `"use client"`.

  `readServerConsent` returns `null` — meaning "show the banner" — for a first-time visitor, a cookie
  recording no choice yet, a corrupt cookie, or one written against a different category taxonomy. That
  last rule mirrors the client's exactly, including the exception that honours a legacy cookie with no
  taxonomy stamp on the built-in five categories, so an upgrade never re-prompts existing visitors. If
  the two ever disagreed, the banner would flash again.

  `initialConsent` is a provider prop rather than an `initCookieYes` option deliberately: the consent
  runtime is a module-level singleton shared across concurrent server requests, so per-visitor state
  stored there would leak between visitors. React context is per-request.

  Purely additive — omitting `initialConsent` leaves rendering byte-for-byte as it was.

### Patch Changes

- 95c56c9: A failing third-party tag can no longer strand the consent banner — or stop the SDK mounting

  Two ordering/isolation fixes on the consent path. Both address the same failure: side effects that
  run third-party code were able to throw before the SDK told anyone about the consent decision.

  **Accepting or rejecting.** `persist()` ran gated-script injection, integration stop handlers and
  the Google Consent Mode broadcast _before_ notifying subscribers. Two of those can throw for reasons
  outside this SDK's control — script injection touches the DOM, and the Consent Mode broadcast calls
  `dataLayer.push`, which Google Tag Manager replaces with its own function that runs
  customer-authored templates. When one threw, `notify()` never ran: the consent cookie recorded the
  visitor's choice, but the banner stayed on screen until the next page load. The click looked like it
  had done nothing.

  The decision is now committed (cookie written, categories committed) and broadcast to subscribers
  first, and each side effect afterwards is isolated, so no single failure can strand the banner or
  prevent the others from running.

  **Mounting.** The same broadcast also runs at load, inside `createConsentManager`, where it was
  likewise unguarded — so a throwing `dataLayer.push` propagated out of `initCookieYes` and the SDK
  never mounted at all. No banner, no consent prompt, caused by an unrelated broken tag. That call and
  the load-time stop-handler pass are now isolated too.

  Notes on observable behaviour:

  - `onConsentUpdate` still fires synchronously within the accept/reject call, as before.
  - The Consent Mode broadcast still happens in the same task as the click, so tags see the update
    immediately.
  - Consent-gated scripts are now injected just after subscribers are notified rather than just
    before. If you have a callback that inspected the DOM for an injected `<script>` synchronously
    inside a consent listener, it will no longer find it there.
  - This is not a latency change. Reordering work inside one task cannot make the browser paint
    sooner; measured click-to-visible-response is ~11ms either way.

- e25dc2f: Add `_clearScriptRegistry()` — an internal, test-only reset for the consent-gated script registry, mirroring the existing `_clearStopHandlers()`.

  The registry is module-level with no way to empty it, so a script registered in one test stayed registered for the next. It now clears both the registrations and the record of what was injected, removing the injected `<script>` elements from the document when there is one.

  Consumed by the new `@cookieyes/test` package to guarantee a clean slate per test.

  Also add `CORE_VERSION` — the version this build was produced from, injected at build time from `package.json` so it cannot drift from the manifest. `@cookieyes/test` reads it to warn when a project's test double and engine versions don't match, rather than silently testing against rules the project isn't shipping.

  Both exports are additive: no existing symbol or behaviour changes.

## 0.3.0

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

## 0.2.0

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
