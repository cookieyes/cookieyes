---
"@cookieyes/devtools": minor
---

The Scanner now suggests the ready-made integration for Mixpanel.

**What changed.** When the Scanner finds Mixpanel loading outside the SDK, the suggested fix is now `mixpanel({ token })` from `@cookieyes/scripts`, instead of a generic `customScript()`.
