---
"@cookieyes/cli": patch
---

Apps set up in self-hosted mode by `cookieyes init` now retry a consent record that their server failed to store.

**Fixed: failed records were treated as stored.** For self-hosted mode, `init` wrote a `backend.persist` adapter that sent the record with `fetch` but never threw when the server answered with an error, so the SDK took every record as stored and never sent it again. `init` now writes `apiUrl: "<your URL>"` instead, and the SDK's own sender checks the response and retries. If you set up self-hosted mode with an earlier version, replace the `backend` block in your config with `apiUrl` and the same URL.
