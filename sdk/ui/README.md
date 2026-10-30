<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/cookieyes/cookieyes/main/.github/assets/banner-dark.svg">
    <img src="https://raw.githubusercontent.com/cookieyes/cookieyes/main/.github/assets/banner-light.svg" alt="CookieYes consent banner, styled by @cookieyes/ui" width="820">
  </picture>
</p>

<h1 align="center">@cookieyes/ui</h1>

<p align="center"><strong>The framework-free banner layer of the CookieYes SDK.</strong></p>

<p align="center">The stylesheet, theme tokens, markup and accessibility behaviour that every CookieYes banner shares, whatever draws it.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@cookieyes/ui"><img src="https://img.shields.io/npm/v/@cookieyes/ui" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@cookieyes/ui"><img src="https://img.shields.io/npm/dw/@cookieyes/ui" alt="npm downloads"></a>
  <a href="https://github.com/cookieyes/cookieyes/actions/workflows/ci.yml"><img src="https://github.com/cookieyes/cookieyes/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/@cookieyes/ui" alt="license"></a>
</p>

<p align="center">
  <a href="#who-this-is-for">Who this is for</a> ·
  <a href="#what-is-in-it">What is in it</a> ·
  <a href="#draw-the-banner-on-a-server">Server markup</a> ·
  <a href="https://developers.cookieyes.com">Docs</a>
</p>

---

## Who this is for

You probably do not need to install this package yourself.

- **React or Next.js:** use `@cookieyes/react` or `@cookieyes/nextjs`. They are built on this package.
- **No framework, or a framework without an adapter yet:** use `@cookieyes/vanilla`, which draws the banner from this package.
- **Building an adapter for another framework:** this package is for you.

Consent decisions (what is granted, what loads, what is stored) are not here. They live in
`@cookieyes/core`. This package decides how the banner looks and how focus moves, never what a
visitor has agreed to.

## What is in it

| Export | What it gives you |
|---|---|
| `@cookieyes/ui/styles.css` | The full stylesheet, identical in every framework |
| `@cookieyes/ui/critical.css` | The banner-only subset to inline in `<head>`, so the banner is styled at first paint |
| `banner`, `bannerAnnouncer`, `preferences`, `optOut`, `reloadNotice`, `recallButton` | Each component's markup as data: elements, `data-cy-part` and `data-cy-state` hooks, roles and ARIA attributes |
| `renderToString`, `renderToDom` | Turn that markup into an HTML string (a server, a static page) or into real elements (a browser). Text is always escaped or inserted as text, never as HTML. |
| `CY_PART`, `CY_STATE` | The names of every styleable part and state |
| `computeThemeVars`, `loadThemeRuntime` | What each `theme` setting turns into, and the on-demand code that applies a custom theme |
| `activateDeferredStylesheets`, `warnOnStyleCspViolations` | First-paint and Content Security Policy helpers |
| `trapFocus`, `closeOnEscape`, `rememberOpener`, `focusDialog`, `focusRecallAfterBanner`, `bodyPortalRoot` | Keyboard and focus behaviour. Each takes the elements it works on and returns a function that undoes it. |
| `announceBanner`, `ANNOUNCE_DELAY_MS` | When and how the banner is announced to screen readers |
| `applyTheme`, `watchPrefersDark` | Apply the colour scheme and a custom theme to a component |
| `isBannerVisible`, `isRecallVisible`, `optOutReducer`, `startOptOutCountdown`, `categoryText` | The rules every framework follows: when each component shows, how the opt-out dialog moves from open to confirmed to closed, and which text a category shows |

## Draw the banner on a server

```ts
import { defaultTranslations } from "@cookieyes/core";
import { banner, bannerAnnouncer, renderToString } from "@cookieyes/ui";

const html = renderToString([
  bannerAnnouncer(),
  banner({ translations: defaultTranslations, regulation: "GDPR", titleId: "cy-banner-title" }),
]);
```

This is the same markup `@cookieyes/react` renders on the server. A test in that package compares
the two for every state and fails on any difference, so a banner drawn from this package looks and
reads exactly like the React one.

## Attach behaviour to your own elements

```ts
import { closeOnEscape, focusDialog, trapFocus } from "@cookieyes/ui";

// When your dialog appears:
const release = [trapFocus(() => dialogEl), closeOnEscape(close), focusDialog(dialogEl)];
// When it goes away:
for (const undo of release) undo();
```

Reduced motion needs no code: the stylesheet turns the entry animation off under
`prefers-reduced-motion: reduce`.

## Rules this package keeps

- No framework code and no browser assumption at load time: it imports cleanly in plain Node.
- No CSS cascade layers (`@layer`). Host page resets beat layered rules and once stripped the
  banner's padding.
- Theme colours are applied through the CSSOM, never a generated `<style>` block, so a strict
  `style-src` policy needs no exception.

## License

MIT
