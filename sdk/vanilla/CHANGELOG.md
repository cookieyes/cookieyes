# @cookieyes/vanilla

## 0.1.0

### Minor Changes

- 9f35cc9: New: `@cookieyes/vanilla`, the CookieYes banner for any web page with no framework, or a framework without an adapter yet.

  **`start(config)`** puts the banner, the preferences and opt-out dialogs, the reload notice and the recall button on the page, each when its state calls for it. It takes the same configuration as `initCookieYes`, so a configuration copies across from React unchanged, and returns the consent runtime from `@cookieyes/core`. `openPreferences()` and `openOptOut()` open the dialogs from links of your own, and `destroy()` removes every element and listener `start` added. `renderShell(config)` returns the banner as HTML, for showing it before any script runs, and `start` takes it over without a flash; given a request's `cookieHeader`, it returns nothing for a visitor who has already decided.

  **The same banner as React.** It draws `@cookieyes/ui`'s markup, so parts, `--cy-*` variables, theme settings and translations are identical, and it passes the same conformance suite as `@cookieyes/react`, in jsdom and in a real browser. Translations are always inserted as text, never as HTML.

  **This is the open-source SDK, not the CookieYes platform script.** It is configured in code, needs no account and never talks to CookieYes servers.

  **`@cookieyes/ui` and `@cookieyes/vanilla` are released together** at the same version. `ui` no longer exports its icon functions, which nothing outside it used, and `warnOnStyleCspViolations` now returns a function that removes its listener.

  Measured with `pnpm size` against an empty Next.js app: 13.14 KB gzipped for the banner and recall button. The two dialogs, 5.34 KB more, load the first time a visitor opens one.

### Patch Changes

- Updated dependencies [0708d84]
- Updated dependencies [2aee204]
- Updated dependencies [0965b85]
- Updated dependencies [5e27cb2]
- Updated dependencies [9f35cc9]
  - @cookieyes/core@0.13.0
  - @cookieyes/ui@0.1.0
