---
name: gate-third-party-scripts
description: "Load Google Analytics, Google Tag Manager, Google Ads, Meta Pixel, Microsoft Clarity, PostHog, Segment or any script only after the visitor consents, with the @cookieyes/scripts integrations and Google Consent Mode v2."
---

# Load third-party tools only after consent

Use this when a site already has the CookieYes banner (see the `install-consent-banner` skill) and a tag must wait for consent. An integration loads the tool when the visitor grants its category and stops it when consent is withdrawn. No consent checks are needed in the site's own code. Docs: https://developers.cookieyes.com/docs/nextjs/integrations

## 1. Install the integrations package

```bash
npm install @cookieyes/scripts
```

## 2. Add the integration to the existing `initCookieYes()` call

```tsx
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

## 3. Google tools need the Consent Mode default

GA4, GTM and Google Ads read consent through Google Consent Mode. Add a "denied" default before any Google tag runs; the SDK sends every update afterwards.

Next.js, first thing in `<body>` of the root layout:

```tsx
import { GoogleConsentMode } from "@cookieyes/nextjs/server";
// ...
<body>
  <GoogleConsentMode />
  <CookieYesRoot />
  {children}
</body>
```

React or plain JavaScript, in the same file as `initCookieYes()`, before the call:

```ts
import { bootstrapGoogleConsentMode } from "@cookieyes/scripts";

bootstrapGoogleConsentMode();
```

Category to Google signal: `analytics` grants `analytics_storage`; `advertisement` grants `ad_storage`, `ad_user_data`, `ad_personalization`; `functional` grants `functionality_storage`, `personalization_storage`. `security_storage` is always granted.

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
