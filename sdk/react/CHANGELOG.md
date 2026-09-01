# @cookieyes/react

## 0.6.0

### Minor Changes

- e2baba4: Dev-mode console warnings for low-contrast theme colours.

  In development builds only (`process.env.NODE_ENV !== "production"`), the SDK now warns in the
  console when your configured `textColor`/`mutedTextColor` fall below WCAG AA contrast (4.5:1)
  against `backgroundColor`, checked independently for light and dark mode. Warnings name the exact
  failing pair and the threshold missed. Values the SDK cannot parse (anything other than 3- or
  6-digit hex) are skipped silently rather than risk a false warning. Nothing changes in production
  builds — this is a new export (`contrastRatio`, internal to the package) and a new dev-only side
  effect, not a behaviour change to any rendered output.

- e2baba4: Dev-mode console warning when the installed React version is newer than anything this SDK's CI
  peer-dependency matrix has verified.

  In development builds only (`process.env.NODE_ENV !== "production"`), the SDK now warns once per
  unique React version if `React.version`'s major is higher than the newest major the CI matrix has
  tested — the SDK likely still works (it avoids version-specific APIs) but this hasn't been
  verified yet. The warning is silent on any version the matrix already covers, including the
  declared `>=18.0.0` floor (peerDependencies resolution at install time already enforces that).
  Next.js version compatibility is intentionally not checked here — `@cookieyes/react` has no
  dependency on `next`; the published compatibility table in the README is the source of truth for
  that. No production behaviour change, no new public export — a new dev-only side effect at mount
  time, same class of change as the existing contrast-warning changeset.

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

- a9282dd: Per-part styling for the presets. `CookieBanner`, `CookiePreferences`, and `CookieOptOut` now accept `classNames` / `styles` maps — typed to the part names (`BannerPart` / `DialogPart` / `OptOutPart`) so they autocomplete — alongside the existing `className` / `style` for the card. A `styles` value is inline, so it always wins; a `classNames` value competes like any class.

  Every interactive part is styleable by state: `data-cy-part` with native `:hover` / `:focus-visible` / `:disabled`, plus `data-cy-state="on" | "off"` for a checked toggle. The `--cy-*` design tokens are documented as a supported reference, with recipes for brand colour, dark mode, matching a design system, and styling a checked toggle. Our styles stay low-specificity and isolated so a stray global rule in your app won't accidentally reshape the banner.

- e2baba4: Make nine previously hardcoded English strings translatable. Until now a fully translated site still announced these in English to screen reader users, and showed English text inside an otherwise translated interface.

  The strings are: the visible "Always Active" label shown on a required category; the accessible names of the preferences dialog, the opt-out dialog and the floating recall button; both pieces of `<GatedFrame />`'s blocked-content placeholder; and the accessible names of the three close buttons — on the banner (rendered under CCPA), the preferences dialog and the opt-out dialog.

  The close buttons were the most consequential of the nine. Each renders only an `aria-hidden` icon, so the hardcoded English label was the button's entire accessible name — on a fully translated site, a screen reader still announced "Close".

  Nine keys are added to `TranslationMap` — `alwaysActive`, `preferencesDialogLabel`, `optOutDialogLabel`, `recallButtonLabel`, `bannerCloseLabel`, `preferencesCloseLabel`, `optOutCloseLabel`, and a `gatedFrame` group holding `placeholder` and `action` — and all five shipped languages (English, German, Spanish, French, Italian) supply them. `gatedFrame.placeholder` substitutes `{category}`, following the same placeholder convention as `optOut.successCountdown`'s `{seconds}`.

  The recall button's tooltip was a second, separate hardcoded copy of its label; it now reads the same key.

  Because the keys are required on `TranslationMap`, every shipped language must supply them — a missing translation is a build error rather than a silent English fallback. If you declare a full `TranslationMap` of your own you will need to add the nine keys; if you pass a partial object to `i18n.messages` (the usual case) nothing changes, and anything you omit still falls back to English.

- e2baba4: Primary buttons now visibly darken on hover instead of only fading.

  `--cy-primary-hover` has existed since the theming tokens shipped but was never consumed by any
  rule — every button's hover state, including primary buttons, only faded to 80% opacity. Primary
  buttons now also shift to `--cy-primary-hover` (a darker mix of your primary colour) on hover,
  with the fade disabled so only the colour shift is visible — matching what the token's name always
  implied it did. If you've customised `--cy-primary-hover` via the documented `!important` override,
  that customisation is now visible for the first time.

  This covers both primary-styled buttons: the banner's primary action and the CCPA opt-out dialog's Save button, which share the same background and text colours at rest and now share the same hover treatment.

### Patch Changes

- e2baba4: Point the blocked-style console warning at the published CSP documentation instead of a GitHub README anchor.

  When a `style-src` violation is detected the SDK warns and links to the policy it needs. That link pointed at `github.com/cookieyes/cookieyes/tree/main/sdk/react#content-security-policy`; it now points at the documentation site, which covers the same ground plus the case where an inlined `critical.css` needs its own hash or nonce. Message text is otherwise unchanged.

- ae888a9: Give every documentation link a working destination.

  Three deprecation warnings previously gave a reader nowhere useful to go: the `mode: "offline"` rename and the `builtInIntegrations` warning carried no link at all, and the builder deprecation pointed at a raw Markdown file in the GitHub repository. All three now link to the [migration guide](https://github.com/cookieyes/cookieyes/blob/main/apps/web/content/docs/migration.mdx).

  The package READMEs linked to a repository copy of the "Which API should I use?" decision tree that had drifted out of date — it still told Next.js users to read server-side consent with `parseCookie()` from `@cookieyes/core`, when the correct API is `getServerConsent()` from `@cookieyes/nextjs/server`. Every README now links to the maintained copy, and the older repository copy is a pointer rather than a second source of truth.

  Links point at the documentation sources in this repository. They will move to the documentation site once it is published.

  Documentation links only; no behaviour or API changes.

- e2baba4: Export the prop types for `<RecallButton />`, `<GatedScript />` and `<GatedFrame />` as `RecallButtonProps`, `GatedScriptProps` and `GatedFrameProps`.

  All three components already accepted these props; the types were simply declared inline and unexported, so there was no public name to reference when typing a wrapper component or a helper that forwards props. The three preset components (`CookieBanner`, `CookiePreferences`, `CookieOptOut`) have always exported theirs — this brings the remaining three into line.

  Additive only: no runtime behaviour changes and no existing import breaks.

- e2baba4: State a concrete removal timeline everywhere a deprecation promises one.

  The `builtInIntegrations` warning said "a future release" while the other two warnings committed to three release cycles. Every deprecation now says "after three release cycles" — the runtime warnings _and_ the `@deprecated` TSDoc on `mode: "offline"` and `builtInIntegrations`, which is what shows in an editor hover tooltip and had been left saying "a future release". Message and doc-comment text only — no behaviour change.

- e2baba4: Remove `buttonVariant` and `widgetPosition` from the README's theme example. Neither key was ever read by any component or stylesheet rule, and both have been removed from `ThemeConfig` in `@cookieyes/core`. Documentation only.
- e2baba4: Fix the "no runtime is registered" error and the "mounted more than once" warning to name `initCookieYes(...)`, the current API, instead of the deprecated `createCookieYes().mount()` builder they mistakenly still referenced. No behavior change — message text only. If you grep your code or logs for the old wording, update to the new text (see [Troubleshooting](https://github.com/cookieyes/cookieyes/blob/main/apps/web/content/docs/troubleshooting.mdx)).
- Updated dependencies [ae888a9]
- Updated dependencies [e2baba4]
- Updated dependencies [e2baba4]
- Updated dependencies [e2baba4]
- Updated dependencies [e2baba4]
- Updated dependencies [e2baba4]
- Updated dependencies [e2baba4]
  - @cookieyes/core@0.5.0

## 0.5.0

### Minor Changes

- 53e5d9d: Add `@cookieyes/react/critical.css` — the paint-critical banner stylesheet

  `styles.css` is ~25 KB and styles every surface: banner, preferences dialog, opt-out flow,
  toggles, revisit widget, reload notice. If your bundler puts it in the critical path — what
  an app-root `import` normally does — the banner is already styled at first paint and you
  need nothing new.

  For anyone who would rather keep that 25 KB off the critical path, `critical.css` contains
  only the rules needed to render the banner (~1.6 KB gzipped). Inline it in `<head>` and load
  the full sheet without blocking render:

  ```html
  <style>
    /* contents of @cookieyes/react/critical.css */
  </style>
  <link
    rel="stylesheet"
    href="…/styles.css"
    media="print"
    onload="this.media='all'"
  />
  ```

  Every rule in it is byte-identical to the same rule in `styles.css`, enforced by a test, so
  the two can never disagree about how the banner looks. It is a supplement, not a
  replacement — keep importing `styles.css`, or the preferences dialog will be unstyled when a
  visitor opens it.

  Purely additive: `styles.css` is unchanged and existing setups need no edits.

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

- 80658c4: Fix the banner painting unstyled on first load, and replace its slide-in with a fade

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

- 80658c4: The banner no longer fades in twice on slower devices

  The banner is server-rendered inline (React cannot server-render a portal), then moves into a
  `<body>` portal just after hydration so it can escape any transformed ancestor. That move replaces
  its DOM node, and the replacement re-ran the CSS entry animation.

  On a fast machine this was invisible: the swap lands inside the 200ms fade, so it reads as one
  continuous ramp. On a slow device it was not. Measured under 20× CPU throttling, hydration landed
  around a second in — long after the fade had finished — so the visitor watched a fully visible
  banner **disappear and fade in again**. Opacity dropped by 0.73–1.00 at the swap.

  `Banner.Root` now marks the re-parent, and the replacement keeps the banner visible instead of
  re-animating. Measured opacity drop after the change: 0.000, on both a fast machine and under 20×
  throttling.

  Unchanged: the banner still animates when it genuinely appears, including when it reappears after
  `resetConsent()`, and the exit fade still plays on accept/reject.

  If you override `.cy-banner`'s `animation` in your own CSS, note the new
  `.cy-banner-wrap[data-cy-entered] .cy-banner:not([data-leaving])` rule, which sets
  `animation: none` for the re-parent case only.

- 53e5d9d: Minify the shipped stylesheets

  `dist/styles.css` was copied verbatim from source, so consumers downloaded the source comments —
  and the source is deliberately heavily commented, because several rules encode non-obvious
  reasoning. The build now strips comments and collapses whitespace, taking `styles.css` from 4.80 KB
  to 3.68 KB gzipped.

  The transform is deliberately conservative — comment removal and whitespace collapsing only, no
  value shortening, no rule merging, no reordering — so it cannot change what the CSS means. Space
  after `:` is even left intact, since collapsing it is only safe inside a declaration and not in a
  selector. It is verified by tests asserting every declaration survives, braces stay balanced, and
  the constructs this sheet relies on (`calc()`, `color-mix()`, quoted font names, `:where()`,
  attribute selectors) come through unchanged.

  Net effect of this release on what an existing consumer downloads: **0.87 KB gzipped smaller**, with
  the SSR, first-paint and consent-isolation work included.

- Updated dependencies [95c56c9]
- Updated dependencies [e25dc2f]
- Updated dependencies [f4e54aa]
- Updated dependencies [73bd445]
- Updated dependencies [b436f2c]
  - @cookieyes/core@0.4.0

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
  - @cookieyes/core@0.3.0

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

- 19fe0ac: Fix keyboard/focus-management and screen-reader gaps in `<CookieBanner />`,
  `<CookiePreferences />`, and `<CookieOptOut />`:

  - Opening `<CookiePreferences />` or `<CookieOptOut />` now moves focus into
    the dialog automatically; closing it (Save, Cancel, or `Esc`) now returns
    focus to whichever control opened it — including when that control was the
    banner or the recall button, both of which remount when the dialog closes.
  - The Preferences category toggles (`role="switch"`) now have a real
    accessible name — previously an `aria-label`-less switch, announced by
    screen readers with no indication of which category it controlled.
  - The banner is now announced by screen readers when it first appears, via
    an `aria-live="assertive"` announcer that's rendered independently of the
    banner's own mount/hide cycle and populated after a short delay rather
    than immediately — a live-region update fired right at page-load time
    commonly gets dropped while the screen reader is still announcing the
    navigation itself.
  - The banner now portals to the front of `<body>` once mounted (still
    server-rendered inline first, so there's no change to first-paint/CLS
    behavior). Previously it rendered wherever `<CookieYesRoot>` was mounted —
    after the app's own content, per both the docs and the CLI's scaffold —
    which put it last in the page's reading order. A screen-reader or
    keyboard user couldn't reach it without stepping through the entire page
    first; now it's reachable within the first Tab/swipe.
  - All entrance/exit animations (banner, dialogs, recall button) now respect
    `prefers-reduced-motion: reduce` — same end state, no motion.
  - Adds automated `axe-core` accessibility tests for the banner and both
    dialogs, and documents the keyboard/focus contract and a scoped
    accessibility posture statement in the README.

  No public API changes — this is behavior/bug fixes to existing components.

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

- Updated dependencies [18bec21]
- Updated dependencies [e43f502]
- Updated dependencies [364051f]
- Updated dependencies [10c922e]
- Updated dependencies [8de8b3c]
- Updated dependencies [2971d7d]
- Updated dependencies [8fdea17]
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
  - @cookieyes/core@0.1.1
