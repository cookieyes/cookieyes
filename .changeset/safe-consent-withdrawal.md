---
"@cookieyes/core": minor
"@cookieyes/react": minor
"@cookieyes/nextjs": minor
"@cookieyes/translations": minor
---

Stop tracking safely when consent is withdrawn — without reloading the page.

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
