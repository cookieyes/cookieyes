---
"@cookieyes/core": patch
---

Add `_clearScriptRegistry()` — an internal, test-only reset for the consent-gated script registry, mirroring the existing `_clearStopHandlers()`.

The registry is module-level with no way to empty it, so a script registered in one test stayed registered for the next. It now clears both the registrations and the record of what was injected, removing the injected `<script>` elements from the document when there is one.

Consumed by the new `@cookieyes/test` package to guarantee a clean slate per test.

Also add `CORE_VERSION` — the version this build was produced from, injected at build time from `package.json` so it cannot drift from the manifest. `@cookieyes/test` reads it to warn when a project's test double and engine versions don't match, rather than silently testing against rules the project isn't shipping.

Both exports are additive: no existing symbol or behaviour changes.
