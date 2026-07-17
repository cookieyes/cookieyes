---
"@cookieyes/core": minor
"@cookieyes/react": minor
"@cookieyes/nextjs": minor
"@cookieyes/cli": minor
---

Standardize the configuration API across packages with a single canonical
`CookieYesConfig` object and one setup function, `initCookieYes(config)`.

- **`initCookieYes(config)`** is the new setup entry point in `@cookieyes/core`,
  `@cookieyes/react`, and `@cookieyes/nextjs`. A config object is copy-pasteable
  between packages with zero edits.
- **`CookieYesConfig`** (exported from core, re-exported everywhere) is a flat,
  strictly-typed discriminated union on `mode` — backend keys under
  `mode: "offline"` are now a compile-time error.
- **`regulation`** is a top-level key everywhere. The nested
  `overrides.regulation` still works (deprecated) and maps to it.
- **`apiUrl`** replaces `backendURL` as the canonical self-hosted key;
  `backendURL` still works (deprecated) and maps to it.
- The **`createCookieYes()` builder is deprecated** in favour of
  `initCookieYes`. It keeps working and emits a one-time console warning; it
  will be removed after three release cycles.
- Non-breaking: the builder, `overrides.regulation`, and `backendURL` all keep
  working through the deprecation window. `ConsentRuntimeOptions` is retained as
  a deprecated alias of `CookieYesConfig`.
- The `@cookieyes/cli` `init` command now scaffolds `initCookieYes({...})` and
  top-level `regulation`, so fresh projects don't hit the deprecation warnings.
