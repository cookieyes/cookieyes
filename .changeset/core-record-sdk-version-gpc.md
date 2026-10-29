---
"@cookieyes/core": minor
---

Each consent record now says which SDK build sent it and whether the visitor's browser sent Global Privacy Control, so a stored record carries more of the evidence you need to show what the visitor saw.

**New: `sdkVersion` and `gpc` in the self-hosted payload.** `sdkVersion` is the version of `@cookieyes/core` that built the record. `gpc` is `true` when `navigator.globalPrivacyControl` was on at the moment of the decision, and `false` otherwise. Both are on `ConsentPayload` and are sent with every record. Neither is part of `recordId`, so a record still waiting in the retry queue from an earlier version keeps its id and is not stored twice.

Measured with `pnpm size`: `@cookieyes/core` grows by 38 bytes of gzip.
