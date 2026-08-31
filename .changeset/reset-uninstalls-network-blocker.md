---
"@cookieyes/core": patch
---

`resetConsentRuntime()` now un-patches `fetch`, `XMLHttpRequest` and `navigator.sendBeacon` before dropping the runtime.

The network blocker is a module-level singleton, and installing a second one while the first is active is a deliberate no-op. Because `resetConsentRuntime()` cleared the runtime without uninstalling the blocker, an application that reset and re-initialised was left in a state that looked correct and was not: the previously patched transports stayed in place, still consulting the **old** manager's committed-consent closure, while the new `initCookieYes()` call's `networkBlocker` rules were silently discarded. Nothing was logged.

Only `@cookieyes/test`'s `resetConsentTestState()` uninstalled the blocker, so test suites were unaffected — this reached applications that call the public `resetConsentRuntime()` themselves, for example when tearing down and rebuilding consent on a route change.

The uninstall is idempotent, so calling it when nothing was installed remains a no-op, and `resetConsentTestState()`'s existing uninstall-first ordering is unchanged.
