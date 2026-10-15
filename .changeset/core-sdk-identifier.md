---
"@cookieyes/core": minor
---

Pages that run the SDK now identify it in the browser, so public technology scanners can recognise sites that use it.

**New: `window.CookieYesSDK`.** When the SDK starts in the browser it sets `window.CookieYesSDK` to `{ version }`, the `@cookieyes/core` version. It is set on every page where the SDK starts, whether or not the banner shows, and with core alone, the React components or a headless UI. It holds the version only: nothing about your site, your configuration or your visitors. It is never set during server rendering, adds no DOM node and makes no network request. No configuration change is needed.

Measured with `pnpm size`: 26 bytes more client JavaScript (gzip) for every setup.
