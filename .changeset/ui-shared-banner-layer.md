---
"@cookieyes/ui": minor
"@cookieyes/react": patch
---

The banner's stylesheet, theme tokens and markup now live in one framework-free package, `@cookieyes/ui`, so every framework draws the same banner.

**New: `@cookieyes/ui`.** It holds `styles.css` and `critical.css`, the `--cy-*` theme tokens, the `CY_PART` and `CY_STATE` styling hooks, and the markup of the banner, the preferences dialog, the opt-out dialog, the reload notice and the recall button as plain data. `renderToString` turns that markup into HTML for a server or a static page, and `renderToDom` turns it into elements in a browser. Text is always escaped or inserted as text, never as HTML. It also holds the behaviour every framework shares: the focus trap, Escape to close, returning focus to whatever opened a dialog, the delayed screen-reader announcement, applying a custom theme, and the rules for when each component shows and how the opt-out dialog counts down. Each behaviour takes the elements it works on and returns a function that undoes it. It is the base for framework adapters; React and Next.js users do not need to install it.

**`@cookieyes/react` is built on it, with nothing to change on your side.** `@cookieyes/react/styles.css`, `@cookieyes/react/critical.css`, `CY_PART`, `CY_STATE` and every component render exactly as before; a test compares React's output with `@cookieyes/ui`'s markup for every state and fails on any difference. The only visible change is the tick in the opt-out confirmation, whose coordinates are now rounded to two decimals like the other icons, a difference smaller than one pixel.

Measured with `pnpm size`: the React banner and interface layers grow by 29 and 30 bytes of gzip, the cost of the shared behaviour taking the elements it works on as arguments; `@cookieyes/core` is unchanged.
