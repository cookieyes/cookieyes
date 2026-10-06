---
name: gate-third-party-scripts
description: "Load Google Analytics, Google Tag Manager, Google Ads, Meta Pixel, Microsoft Clarity, PostHog, Segment or any script only after the visitor consents, with the @cookieyes/scripts integrations, a custom integration of your own, and Google Consent Mode v2."
---

# Load third-party tools only after consent

Use this when a site already has the CookieYes banner (see the `install-consent-banner` skill) and a tag must wait for consent. An integration loads the tool when the visitor grants its category and stops it when consent is withdrawn. Google tools are the exception by default: see section 3. No consent checks are needed in the site's own code. Docs: https://developers.cookieyes.com/docs/nextjs/integrations

## 1. Install the integrations package

```bash
npm install @cookieyes/scripts
```

## 2. Add the integration to the existing `initCookieYes()` call

```tsx title="app/consent-manager.tsx"
import { initCookieYes } from "@cookieyes/nextjs"; // or "@cookieyes/react" / "@cookieyes/core"
import { ga4 } from "@cookieyes/scripts";

initCookieYes({
  mode: "cookie-only",
  regulation: "GDPR",
  integrations: [ga4({ measurementId: "G-XXXXXXX" })],
});
```

Remove any vendor snippet that was pasted into the HTML by hand. The integration adds the script itself.

| Tool | Integration | Required option | Default category |
| --- | --- | --- | --- |
| Google Analytics 4 | `ga4({ measurementId })` | `"G-…"` | `analytics` |
| Google Tag Manager | `googleTagManager({ containerId })` | `"GTM-…"` | `analytics` |
| Google Ads | `googleAds({ conversionId })` | `"AW-…"` | `advertisement` |
| Meta Pixel | `metaPixel({ pixelId })` | numeric pixel id | `advertisement` |
| Microsoft Clarity | `clarity({ projectId })` | id from `clarity.ms/tag/<id>` | `analytics` |
| PostHog | `posthog({ apiKey, onReject })` | `"phc_…"` and `"stop"` or `"anonymous"` | `analytics` |
| Segment | `segment({ writeKey })` | source write key | `analytics` |
| Any other script | `customScript({ id, src, category })` | script URL and a category | as given |

The default categories are `necessary`, `functional`, `analytics`, `performance` and `advertisement`. Pass `category` to any integration to change it.

## 3. Google tools need the Consent Mode default

GA4, GTM and Google Ads read consent through Google Consent Mode. Add a "denied" default before any Google tag runs; the SDK sends every update afterwards.

Choose when the Google tag loads with the `consentMode` option of `ga4()`, `googleTagManager()` and `googleAds()`:

- `"advanced"` (default): the tag loads at once, before the visitor decides. While consent is denied, Google receives only cookieless pings. The tag stays loaded after withdrawal; only the Consent Mode signals change.
- `"basic"`: the tag loads only after its category is granted and is removed on withdrawal, with that product's cookies. Nothing reaches Google before a yes.

If the request is "load Google Analytics only after the visitor accepts", use `"basic"` and add the result to `integrations` as in section 2. The Consent Mode default above is still needed:

```ts title="src/ga4-basic.ts"
import { ga4 } from "@cookieyes/scripts";

export const analytics = ga4({ measurementId: "G-XXXXXXX", consentMode: "basic" });
```

Do not override an integration's `load` field by spreading it; `consentMode` is the supported switch.

Next.js, first thing in `<body>` of the root layout:

```tsx check="false"
import { GoogleConsentMode } from "@cookieyes/nextjs/server";
// ...
<body>
  <GoogleConsentMode />
  <CookieYesRoot />
  {children}
</body>
```

React or plain JavaScript, in the same file as `initCookieYes()`, before the call:

```ts title="src/consent.ts"
import { bootstrapGoogleConsentMode } from "@cookieyes/scripts";

bootstrapGoogleConsentMode();
```

Category to Google signal: `analytics` grants `analytics_storage`; `advertisement` grants `ad_storage`, `ad_user_data`, `ad_personalization`; `functional` grants `functionality_storage`, `personalization_storage`. `security_storage` is always granted.

## 4. A tool with no ready-made integration

`customScript({ id, src, category })` covers most tools; `id` is any unique name for the script. Its other options: `match` (`"all"` or `"any"` when `category` is an array), `onRevoke` (`"remove"` by default, or `"keep"` for a script that handles consent itself), `attrs` (extra `<script>` attributes such as a CSP `nonce`) and `stub` (`{ global, methods }` to queue calls made before the script loads).

When the tool needs more than a script tag, write an integration object and add it to `integrations` like any other:

```ts title="lib/my-vendor.ts"
import type { Integration } from "@cookieyes/core";

export const myVendor: Integration = {
  id: "my-vendor",
  category: "analytics",
  version: 1,
  load: "afterConsent",
  onRevoke: "remove",
  setup: () => {
    const script = document.createElement("script");
    script.src = "https://cdn.example.com/vendor.js";
    document.head.appendChild(script);
    return () => script.remove();
  },
};
```

- The `Integration` type comes from `@cookieyes/core`. In a Next.js or React app with a strict package manager such as pnpm, add it as a dev dependency at the version your `@cookieyes/nextjs` or `@cookieyes/react` already uses (`npm ls @cookieyes/core` shows it); the import is type-only.
- `version` is the integration format version. Use `1`; the SDK refuses a version it does not know.
- `setup` runs when the category is granted. What it returns must match `onRevoke`:
  - `"remove"`: a cleanup function. It runs on withdrawal, and `setup` runs again on the next grant.
  - `"silence"`: `{ silence, resume }`. The tool stays loaded and is paused and resumed.
  - `"keep"`: nothing. The tool handles consent itself.
- `setup` receives `{ granted, onConsentChange, region }` for a tool that must react to later changes.
- Keep `load: "afterConsent"`. `"immediately"` runs `setup` before the visitor decides; it is only for tools that stay silent until told otherwise, as Google tags do under Consent Mode.
- `category` can be an array, combined with `match: "all"` (default) or `"any"`.

## Rules that avoid double counting and silent failures

- If GA4 or Google Ads is loaded inside the GTM container, use `googleTagManager()` only, not also `ga4()` or `googleAds()`.
- Microsoft Clarity: turn the **Cookies** toggle off in the Clarity project (Settings, Setup, Advanced settings), or the gate has nothing to hold back.
- PostHog: `onReject` is required. `"stop"` loads nothing before consent; `"anonymous"` counts visits cookie-free before consent and needs Cookieless tracking enabled in PostHog.
- Segment: turn Segment's own consent management off; this integration is the gate.
- Before consent the vendor global does not exist. Guard calls: `window.fbq?.("track", …)`, `window.clarity?.("event", …)`, or `safeCall("analytics", "track", …)` from `@cookieyes/scripts` for Segment and PostHog.
- A custom category must exist in the site's `categories` list, or the integration waits forever; the SDK logs a warning naming it.

## Verify

1. Open the site in a private window: no request to the vendor, no vendor cookie.
2. Accept: the script loads.
3. Withdraw consent in the preferences dialog: the script is removed or paused, depending on the vendor.

## References

- Overview: https://developers.cookieyes.com/docs/nextjs/integrations
- Google Consent Mode v2: https://developers.cookieyes.com/docs/nextjs/integrations/google-consent-mode
- Custom integration: https://developers.cookieyes.com/docs/nextjs/integrations/custom-integration
- Test the gate in unit tests: use the `test-consent` skill on this host.
