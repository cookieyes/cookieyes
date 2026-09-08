---
"@cookieyes/core": patch
---

Stop shipping deprecation-warning text to visitors. The two warnings — `mode: "offline"` and the `builtInIntegrations` field — now return immediately when `process.env.NODE_ENV` is `"production"`, so a production bundler folds the check and drops the message strings as dead code. Measured with `pnpm size`: **224 bytes of gzip out of core**, 175 out of the interface layer.

The warnings are unchanged in development, in tests, and anywhere `NODE_ENV` is not `production`. Nothing about who gets warned changes — a deprecation warning is for whoever is writing the integration, and a visitor can neither act on one nor see it.

The guard is deliberately written as the bare literal `process.env.NODE_ENV === "production"` at the top of each function rather than hoisted into a shared constant, because that is the form bundlers recognise and replace. Two forms that read as equivalent were tried and measured first, and neither works: hoisting it into a file-level `const DEV` folds the constant but leaves every guarded body intact, and wrapping it as `typeof process === "undefined" || process.env.NODE_ENV !== "production"` stops the expression folding altogether — that version made core 10 bytes *larger* and kept every warning string in the bundle. The behaviour is now asserted in `deprecations.test.ts`, since the source looks correct in all three cases and only measurement tells them apart.

The consequence is that these functions need `process` to exist, which in practice means a bundler or Node. That is already true of every supported install path — the package advertises only `import`/`require` conditions and no browser-global build — and it is the same trade React makes for the same reason.
