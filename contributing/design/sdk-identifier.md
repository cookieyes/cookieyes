# SDK identifier

npm downloads count installs, including CI builds and projects that never ship. To count the
public sites that actually run the SDK, the SDK identifies itself on the page and public
technology scanners (Wappalyzer, and HTTP Archive's fork of it that drives its monthly crawl)
match that identifier.

## What the code guarantees

- `createConsentManager()` sets `window.CookieYesSDK = { version: CORE_VERSION }` in the
  browser (`sdk/core/src/manager.ts`). Every setup creates a manager: core alone, the React
  banner, and a fully headless UI. So the identifier is present whether or not a banner shows,
  including for a visitor who already decided and under a regulation that needs no banner.
- It holds the `@cookieyes/core` version and nothing else: no site id, no config, no visitor
  data. It adds no network request and no DOM node.
- It is never set on the server, so it cannot cause a hydration mismatch.

## Why a global and not a `<meta>` tag

The SDK does not own the customer's `<head>`, so a meta tag could only be added from the browser,
which is no more visible to scanners than a global. In a Next.js App Router app React hydrates
the whole document, and a node in `<head>` that React did not render can produce a hydration
mismatch on some React versions. A global touches no DOM and costs a few bytes in core, whose
size budget has little headroom.

## What to protect

The name `CookieYesSDK` and the shape `{ version: string }` are matched by a rule outside this
repository. Renaming it, nesting it differently or adding fields silently stops sites being
counted, and nothing in this repo fails. It must also stay different from the older CookieYes
product's own markers (the `cookieYes` global, `cky-` classes, `#cookie-law-info-bar`), so the two
products are never counted as each other.

The rule as submitted, in Wappalyzer's technology format:

```json
"CookieYes SDK": {
  "cats": [67],
  "description": "CookieYes SDK is an open-source consent management SDK for React, Next.js and JavaScript.",
  "icon": "cookieyes-sdk.svg",
  "implies": "CookieYes",
  "js": { "CookieYesSDK.version": "^(.+)$\\;version:\\1" },
  "dom": "[data-cy-part='banner'] [data-cy-part='accept-all']",
  "website": "https://developers.cookieyes.com/"
}
```

The `dom` pattern is the fallback for SDK versions released before the global existed. It only
matches while the banner is visible and reports no version. If the banner's `data-cy-part` values
change, update the rule too.
