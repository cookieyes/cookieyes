# @cookieyes/ui

## 0.1.0

### Minor Changes

- 0965b85: The banner now works under a strict Content Security Policy when it is server-rendered, "Powered by" is translated, and every control in the opt-out dialog and the reload notice can be styled by part.

  **Fixed: the announcement could show on the page under a strict `style-src`.** The banner's screen-reader announcer was server-rendered with an inline `style` attribute, which a policy without `'unsafe-inline'` blocks, so its text could appear as plain text on the page. It now uses the `.cy-sr-only` class from the stylesheet, which `critical.css` includes. The server-rendered banner has no inline style attributes.

  **Fixed: "Powered by" is translated.** The visible words of the branding link were English in every language. They now come from the `poweredBy` translation, split around the brand name that the logo shows.

  **New parts.** The opt-out dialog's `checkbox`, `checkbox-label`, `cancel`, `confirmation` and `branding`, and the reload notice's `reload` button, now carry `data-cy-part`. `CookieOptOut`'s `classNames` and `styles` accept the same names.

  **Changed: two opt-out dialogs no longer share a checkbox id.** The id was the fixed `cy-ccpa-optout`; it is now generated per dialog. If your CSS or tests targeted `#cy-ccpa-optout`, use `[data-cy-part="checkbox"]` instead.

  **Removed: `data-pos` on the recall button.** No stylesheet rule or setting read it.

  Measured with `pnpm size`: the React banner and interface layers grow by 19 bytes of gzip and `styles.css` by 34, for the new part attributes, the translated branding and the `.cy-sr-only` rule.

- 5e27cb2: The banner's stylesheet, theme tokens and markup now live in one framework-free package, `@cookieyes/ui`, so every framework draws the same banner.

  **New: `@cookieyes/ui`.** It holds `styles.css` and `critical.css`, the `--cy-*` theme tokens, the `CY_PART` and `CY_STATE` styling hooks, and the markup of the banner, the preferences dialog, the opt-out dialog, the reload notice and the recall button as plain data. `renderToString` turns that markup into HTML for a server or a static page, and `renderToDom` turns it into elements in a browser. Text is always escaped or inserted as text, never as HTML. It also holds the behaviour every framework shares: the focus trap, Escape to close, returning focus to whatever opened a dialog, the delayed screen-reader announcement, applying a custom theme, and the rules for when each component shows and how the opt-out dialog counts down. Each behaviour takes the elements it works on and returns a function that undoes it. It is the base for framework adapters; React and Next.js users do not need to install it.

  **`@cookieyes/react` is built on it, with nothing to change on your side.** `@cookieyes/react/styles.css`, `@cookieyes/react/critical.css`, `CY_PART`, `CY_STATE` and every component render exactly as before; a test compares React's output with `@cookieyes/ui`'s markup for every state and fails on any difference. The only visible change is the tick in the opt-out confirmation, whose coordinates are now rounded to two decimals like the other icons, a difference smaller than one pixel.

  Measured with `pnpm size`: the React banner and interface layers grow by 29 and 30 bytes of gzip, the cost of the shared behaviour taking the elements it works on as arguments; `@cookieyes/core` is unchanged.

- 9f35cc9: New: `@cookieyes/vanilla`, the CookieYes banner for any web page with no framework, or a framework without an adapter yet.

  **`start(config)`** puts the banner, the preferences and opt-out dialogs, the reload notice and the recall button on the page, each when its state calls for it. It takes the same configuration as `initCookieYes`, so a configuration copies across from React unchanged, and returns the consent runtime from `@cookieyes/core`. `openPreferences()` and `openOptOut()` open the dialogs from links of your own, and `destroy()` removes every element and listener `start` added. `renderShell(config)` returns the banner as HTML, for showing it before any script runs, and `start` takes it over without a flash; given a request's `cookieHeader`, it returns nothing for a visitor who has already decided.

  **The same banner as React.** It draws `@cookieyes/ui`'s markup, so parts, `--cy-*` variables, theme settings and translations are identical, and it passes the same conformance suite as `@cookieyes/react`, in jsdom and in a real browser. Translations are always inserted as text, never as HTML.

  **This is the open-source SDK, not the CookieYes platform script.** It is configured in code, needs no account and never talks to CookieYes servers.

  **`@cookieyes/ui` and `@cookieyes/vanilla` are released together** at the same version. `ui` no longer exports its icon functions, which nothing outside it used, and `warnOnStyleCspViolations` now returns a function that removes its listener.

  Measured with `pnpm size` against an empty Next.js app: 13.14 KB gzipped for the banner and recall button. The two dialogs, 5.34 KB more, load the first time a visitor opens one.

### Patch Changes

- Updated dependencies [0708d84]
- Updated dependencies [2aee204]
  - @cookieyes/core@0.13.0
