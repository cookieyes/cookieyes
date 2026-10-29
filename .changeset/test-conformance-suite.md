---
"@cookieyes/test": minor
---

New: `@cookieyes/test/conformance`, one test suite that proves a banner behaves like every other CookieYes banner, whatever framework drew it.

**`runConformance(driver, { describe, it })`.** You describe your adapter in a small driver (mount, unmount, click, press a key, switch language) and the suite checks the banner, the preferences dialog, the opt-out dialog, the reload notice and the recall button: every element, part, state and accessible attribute against `@cookieyes/ui`'s markup, Tab order and the focus trap, Escape, where focus goes, the screen-reader announcement, theming, translations, an automated `axe-core` check, and the first HTML when the driver provides `serverHtml`. `pressInDocument` moves focus on Tab the way a browser does, for drivers that run in jsdom.

`@cookieyes/ui` and `axe-core` are new optional peer dependencies, needed only for this entry point. Nothing changes for the existing entry points.
