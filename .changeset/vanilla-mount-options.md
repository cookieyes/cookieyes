---
"@cookieyes/vanilla": patch
---

Adapters built on `@cookieyes/vanilla` can now choose which components the widget draws and add their own classes to its markup, which `@cookieyes/astro` uses for its per-component setup and `classNames`.

**Internal: `_mountWidget(config, { surfaces, decorate })`.** It is not part of the public API and may change without notice. `start()` behaves exactly as before.
