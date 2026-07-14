---
"@cookieyes/core": minor
"@cookieyes/react": minor
"@cookieyes/cli": minor
---

Add `mode: "cookie-only"` as the clearer, self-explanatory replacement for `mode: "offline"`.

Both values behave identically today. `"offline"` is now marked `@deprecated` in
TypeScript (shows as struck-through in editor autocomplete) and logs a one-time,
per-page-load console warning pointing to `"cookie-only"`. `"offline"` will be
removed 3 releases from now; there is no urgency to migrate today, but new
code and docs should use `"cookie-only"`.

The CLI (`@cookieyes/cli init`) now scaffolds new projects with `"cookie-only"`
by default.

```diff
 createCookieYes()
-  .mode("offline")
+  .mode("cookie-only")
   .mount();
```
