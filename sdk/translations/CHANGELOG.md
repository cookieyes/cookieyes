# @cookieyes/translations

## 0.4.0

### Minor Changes

- ab8b82e: Fix twelve accessibility defects in the banner and dialogs. Every one was confirmed in a browser before and after, and the contrast figures below are measured, not estimated.

  **The banner said everything twice.** It carried `aria-live="polite"` on the same element as `role="dialog"`, alongside the visually hidden `aria-live="assertive"` announcer that already exists to announce it. Screen readers announced the banner, then announced it again. The redundant `aria-live` is gone; the deliberate announcer is untouched.

  **The banner had no heading.** Its title rendered as a `<p>`, so a screen reader browsing by structure found nothing, while the two dialogs had used `<h2>` all along. `Banner.Title` now renders `<h2>` — the CSS already resets margin and typography on `.cy-banner-title`, so nothing moves on screen. **This is a breaking type change** for anyone writing `useRef<HTMLParagraphElement>` or `ComponentPropsWithoutRef<"p">` against `Banner.Title`.

  **Three dialogs were named by a second copy of their own title.** The banner's accessible name was a duplicate of the visible title string, and the preferences dialog was worse: it announced "Cookie preferences" while the heading read "Customise Consent Preferences", so a voice-control user asking for what they could see did not get it. All three are now named with `aria-labelledby` pointing at their own visible heading, so the spoken name and the printed name cannot drift apart. `preferencesDialogLabel` and `optOutDialogLabel` remain on `TranslationMap` — removing them would be a breaking change — but they no longer name the dialogs.

  **Colours that failed WCAG.** Six measured failures, all fixed:

  |                              | before | after   |
  | ---------------------------- | ------ | ------- |
  | Customise, dark              | 3.66:1 | 15.64:1 |
  | Do Not Sell, dark            | 3.16:1 | 7.22:1  |
  | Always Active, dark          | 3.35:1 | 7.16:1  |
  | Switch track vs page         | 1.49:1 | 3.45:1  |
  | Switch thumb vs track        | 1.49:1 | 3.45:1  |
  | Opt-out Cancel text, light   | 3.69:1 | 4.83:1  |
  | Opt-out Cancel border, light | 1.33:1 | 4.83:1  |

  `--cy-primary` is untouched: it is your brand colour, and it still fills the primary buttons. What changed is only where it was drawn as _text on the dark surface_, which no brand dark enough to read on white can survive. On the dark scheme the Customise button falls back to the body text colour — the same choice the hosted CookieYes banner makes — and the Do Not Sell link, which CCPA requires visitors to find, is blended toward white so it stays a link and stays readable. The other three were our own hard-coded values, never checked against the dark surface or against each other.

  **The CCPA banner described a button as a link.** `ccpaDescription` told visitors to click a "link" that has always been a `<button>`, so anyone searching for a link did not find one. Corrected in all five languages.

  **The opt-out countdown talked over itself.** The closing timer sat inside the `role="status"` region, so the whole confirmation was re-announced every second — ten times for one saved choice. The countdown is now outside the announced content: it is still on screen, and the confirmation is announced once. Its wording also spells out "seconds" instead of "s".

  **The CookieYes link opened a new tab without saying so.** One key, `opensInNewTab`, is added to `TranslationMap` and supplied by all five shipped languages; it is appended to the branding link's accessible name on the banner and both dialogs. If you declare a full `TranslationMap` of your own you will need to add it; if you pass a partial object to `i18n.messages`, nothing changes.

  One reported issue was not a defect and is unchanged: `aria-modal="false"` on the banner is correct, because the page behind it really does stay interactive — confirmed by clicking through to it with the banner open.

## 0.3.0

### Minor Changes

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
