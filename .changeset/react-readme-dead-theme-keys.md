---
"@cookieyes/react": patch
---

Remove `buttonVariant` and `widgetPosition` from the README's theme example. Neither key was ever read by any component or stylesheet rule, and both have been removed from `ThemeConfig` in `@cookieyes/core`. Documentation only.
