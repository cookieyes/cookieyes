---
"@cookieyes/react": patch
"@cookieyes/nextjs": patch
---

Re-export `registerNetworkBlocker` from `@cookieyes/react` and `@cookieyes/nextjs`, so the `networkBlocker` config key on those packages is actually usable from those packages.

Moving the network blocker to `@cookieyes/core/network-blocker` left a hole: the docs told React and Next.js users to import registration from `@cookieyes/core`, and for most of them that import does not resolve. Under pnpm's strict layout a consumer who installed only `@cookieyes/react` has no `@cookieyes/core` in their `node_modules` root, so the documented instruction fails with `MODULE_NOT_FOUND` — while `networkBlocker` is advertised on the React package's own config type.

It went unnoticed because `apps/web` carries `@cookieyes/core` as a devDependency, so the documentation examples typechecked in an environment no consumer has.

Import `registerNetworkBlocker` from whichever package you installed. Only the registration function is re-exported; `installNetworkBlocker`/`uninstallNetworkBlocker` stay at the core subpath, so the config key remains the only declarative path on the adapters. Measured with `pnpm size`: no change to either layer — the blocker still reaches a bundle only if the export is used.
