---
"@cookieyes/core": patch
"@cookieyes/react": patch
---

State a concrete removal timeline everywhere a deprecation promises one.

The `builtInIntegrations` warning said "a future release" while the other two warnings committed to three release cycles. Every deprecation now says "after three release cycles" — the runtime warnings *and* the `@deprecated` TSDoc on `mode: "offline"` and `builtInIntegrations`, which is what shows in an editor hover tooltip and had been left saying "a future release". Message and doc-comment text only — no behaviour change.
