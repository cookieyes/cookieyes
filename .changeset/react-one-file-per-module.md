---
"@cookieyes/react": patch
---

Apps now download only the parts of `@cookieyes/react` they use.

The package used to ship as one file, and its top-level component definitions looked to bundlers like they might have side effects, so every part was kept. A page showing only `<CookieBanner />` still downloaded the preferences and opt-out dialogs. The ES module build is now one file per module, and the package already declares that its JavaScript has no side effects, so a bundler can leave out every file the app never imports.

Measured on real Next.js apps, as compressed JavaScript loaded with the page:

| App | Before | After |
| --- | --- | --- |
| `<CookieBanner />` alone | 14.26 KB | 11.20 KB |
| Banner, preferences and recall button | 14.74 KB | 13.72 KB |
| `@cookieyes/nextjs`, banner and preferences | 14.75 KB | 12.79 KB |

Nothing changes in how you import or use the package. Every file keeps the `"use client"` directive, and the CommonJS build is unchanged.
