---
"@cookieyes/scripts": minor
---

New integration: TikTok Pixel, consent-gated, with TikTok's consent signal.

**What changed.** `tiktokPixel({ pixelId })` loads the TikTok Pixel after the visitor grants the advertising category, with `ttq.grantConsent()` queued before the script loads. Nothing is on the page before that: no script, no `ttq`, no cookie. On withdrawal it calls `ttq.revokeConsent()`, which makes the pixel drop every later page view and event, and `ttq.disableCookie()`, which has TikTok's server expire its third-party `_ttp` cookie, then deletes the pixel's first-party cookies and sessionStorage keys. No reload, and the pixel is never loaded twice. A visitor whose region resolves to CCPA gets the pixel with `limited_data_use: true`, the same way Meta Pixel gets Limited Data Use; `limitedDataUse` forces it on or off.

`tiktokTrack()`, `tiktokPage()` and `tiktokIdentify()` send events, page views and a logged-in visitor's details; all three do nothing before consent and while it is withdrawn. Standard event names are typed, custom names still work, and `eventId` is sent as `event_id` for de-duplication with the Events API.
