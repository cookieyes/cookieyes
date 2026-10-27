---
"@cookieyes/devtools": minor
---

The Scanner now recognises Ahrefs Web Analytics, and suggests the ready-made integration for Ahrefs and Hotjar.

**What changed.** When the Scanner finds Ahrefs or Hotjar loading outside the SDK, the suggested fix is now `ahrefsAnalytics({ key })` or `hotjar({ siteId, reloadOnRevoke: true })` from `@cookieyes/scripts`, instead of a generic `customScript()`.
