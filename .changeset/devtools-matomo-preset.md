---
"@cookieyes/devtools": minor
---

The Scanner now suggests the ready-made integration for Matomo.

**What changed.** When the Scanner finds Matomo Cloud loading outside the SDK, the suggested fix is now `matomoAnalytics({ matomoUrl, siteId })` from `@cookieyes/scripts`, instead of a generic `customScript()`.
