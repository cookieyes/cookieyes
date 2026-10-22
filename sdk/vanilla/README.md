<h1 align="center">@cookieyes/vanilla</h1>

<p align="center"><strong>The CookieYes consent banner for any web page, with no framework.</strong></p>

<p align="center">The same banner, dialogs and recall button as <code>@cookieyes/react</code>, drawn with plain browser code. For a site with no framework, or one without a CookieYes adapter yet.</p>

---

> **Not the CookieYes platform script.** This is the open-source SDK: you install it, you
> configure it in code, it needs no CookieYes account and it never talks to CookieYes servers.
> If you manage your banner in the CookieYes app, use the script tag the app gives you instead.

## Quick start

```bash
npm install @cookieyes/vanilla
```

```js
import { start } from "@cookieyes/vanilla";
import "@cookieyes/vanilla/styles.css";

const cy = start({ mode: "cookie-only", regulation: "GDPR" });

cy.consentStore.subscribe((state) => {
  if (state.has("analytics")) {
    // load analytics here
  }
});
```

`start` takes the same configuration as `initCookieYes` in `@cookieyes/core` and
`@cookieyes/react`, so a configuration copies across unchanged. It returns the consent runtime
from `@cookieyes/core`, for reading consent and listening to changes.

## Commands

| Command | What it does |
|---|---|
| `start(config)` | Starts the SDK and puts the banner on the page. Calling it again replaces the banner. |
| `openPreferences()` | Opens the preferences dialog, for a "Cookie settings" link of your own. Focus returns to the link when it closes. |
| `openOptOut()` | Opens the CCPA opt-out dialog, for a "Do Not Sell" link of your own. |
| `destroy()` | Removes every element and listener `start` added, and the runtime. |
| `renderShell(config)` | The banner as HTML, for showing it before any script runs (below). |

```js
import { openPreferences } from "@cookieyes/vanilla";

document.querySelector("#cookie-settings").addEventListener("click", (e) => {
  e.preventDefault();
  openPreferences();
});
```

## Show the banner before any script runs

The banner normally appears once your script has loaded. To have it on screen at first paint,
put the banner's HTML and the small first-paint stylesheet in the page itself:

1. Inline `@cookieyes/vanilla/critical.css` in a `<style>` in `<head>`, and load
   `@cookieyes/vanilla/styles.css` as a normal stylesheet.
2. Put the output of `renderShell(config)` at the start of `<body>`, generated at build time or
   on your server with the same `config` you pass to `start`.

When `start` runs, it takes that banner over in the same task, with no flash and no second
entry animation. For a visitor who has already decided, it removes it.

`renderShell` uses the configured `regulation` and the starting language of `i18n`: a static page
cannot know a visitor's region.

## Styling and text

The banner is the same markup as in every CookieYes package: the same `data-cy-part` names,
`--cy-*` variables, `theme` settings and translations. A stylesheet written for the React banner
restyles this one unchanged.

## Size

The preferences and opt-out dialogs load the first time a visitor opens one, so a visitor who
only sees the banner never downloads them. Measured with `pnpm size` against an empty Next.js app:
13.14 KB gzipped for the banner and recall button, 18.48 KB with both dialogs loaded.

## License

MIT
