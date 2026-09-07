---
"@cookieyes/core": minor
"@cookieyes/react": minor
---

The network blocker now ships as its own entry point, `@cookieyes/core/network-blocker`, so customers who do not use it no longer download it.

**Action required if you configure `networkBlocker`.** Add one import before your setup call:

```ts
import { registerNetworkBlocker } from "@cookieyes/core/network-blocker";

registerNetworkBlocker();
```

Configuring `networkBlocker` without registering logs an error naming the missing import and **blocks nothing**. That is a deliberate choice over throwing — taking the page down is not proportionate — but it means the console is the only thing that surfaces it, so check after upgrading. The config shape itself is unchanged.

**Measured saving** (`pnpm size`, compressed delta over an empty Next.js app): `@cookieyes/core` **7.41 KB → 6.95 KB**, the React layer **15.41 KB → 14.92 KB**. Unlike the integration-runner split, `total` falls too — this is a genuine deletion from the bundle, not a deferral. Verified by a bundle breakdown rather than inferred: `onRequestBlocked`, `logBlockedRequests`, `pathIncludes`, `_cyUrl`, `sendBeacon` and the blocked-request message are all absent from a build that never registers it.

**Why a separate entry point and not a dynamic import.** The obvious reading of "load it only when it is used" is `import()`, and it is the wrong one here. The blocker exists to have the browser's networking already replaced when the page starts; between the page starting and a chunk arriving, nothing is patched and an early-firing tag gets through. That is not a performance regression, it is a hole in the thing the feature does, on a compliance product — for about 600 bytes. A separate entry point saves the same bytes and, because it is reached by an ordinary static import, the blocker is loaded before setup runs and patches immediately. **Timing is unchanged for anyone who uses it.**

Behaviour is otherwise identical. All four transports — `fetch`, `XMLHttpRequest.prototype.open`/`send` and `navigator.sendBeacon` — are still replaced and still restored on uninstall, now covered by a test that asserts all four in both directions.

One related fix: `installNetworkBlocker` now records its own teardown, so `resetConsentRuntime()` un-patches the transports whether the blocker was installed through config or by a direct call. Previously a direct call left them patched after a reset, and because a second install is a silent no-op while one is active, the *next* setup would have run on the old rules and the old consent closure while appearing to accept new ones.

`installNetworkBlocker`, `uninstallNetworkBlocker` and the `NetworkBlocker*` types remain exported from the package root as well, so direct callers are unaffected. `@cookieyes/react` and `@cookieyes/nextjs` still do not re-export them; the config key is the only path there.
