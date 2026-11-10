---
"@cookieyes/scripts": minor
---

Matomo now loads only after analytics consent, stops at once when consent is withdrawn, and can count visits without cookies until the visitor decides.

**New: `matomoAnalytics({ matomoUrl, siteId })`.** Pass the values from your Matomo snippet and remove that snippet from your page. In the default `"consent"` mode nothing loads until the visitor grants `analytics`. On withdrawal Matomo stops sending and its `_pk_*` cookies are deleted, with no page reload; accepting again resumes on the same page.

**`consentMode: "cookieless-first"`.** Matomo loads for every visitor and counts visits without cookies. Consent only switches cookies on; withdrawal deletes them and tracking continues cookie-free. Cookie-free tracking still sends the visitor's IP address and browser details, so whether it needs consent is your decision.

**New: `matomoEvent()` and `matomoPageView()`.** They do nothing until Matomo is loaded. Single-page apps call `matomoPageView()` on every route change, because Matomo counts only the first page by itself.

**Matomo's own consent cookies are cleared.** Visitors who still carry `mtm_consent` or `mtm_consent_removed` from an earlier setup, such as Matomo's CookieYes guide, start from CookieYes's record of consent.
