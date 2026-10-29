---
"@cookieyes/test": minor
---

New: `@cookieyes/test/backend`, a conformance suite that proves a consent server keeps the contract the SDK's self-hosted mode relies on, whatever language it is written in.

**`runBackendConformance(target, { describe, it })`.** Point it at a running server's URL and an origin it trusts. It checks that a record sent ten times, or five times at once, is stored once; that a different decision under a stored id is refused; that bodies are validated and size-limited; that only trusted origins get in; and that `/status`, `/openapi.json` and the read route answer. With an owner key it also checks lookup, CSV export, delete and prune, and deletes every record it saved. `BACKEND_CONTRACT_VERSION` names the contract version it checks.

The fidelity table now covers the two new consent record fields: `payload.gpc` is `false` in Node unless `navigator` is stubbed, and `payload.sdkVersion` is `0.0.0-dev` when core is linked from source.
