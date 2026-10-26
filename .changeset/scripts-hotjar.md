---
"@cookieyes/scripts": minor
---

Hotjar now loads only after analytics consent, and its cookies are deleted when consent is withdrawn.

**New: `hotjar({ siteId })`.** Pass the `hjid` value from your Hotjar snippet, and remove that snippet from your page. Nothing loads, and nothing is queued, until the visitor grants `analytics`. On withdrawal, every `_hj*` cookie, Hotjar's storage and its widgets are removed.

**Recommended: `reloadOnRevoke: true`.** Hotjar has no stop command, so it keeps recording until the page reloads, even after consent is withdrawn. This option reloads the page at once. It is off by default; without it, Hotjar stops on the next page load.

**New: `hotjarEvent()`, `hotjarIdentify()` and `hotjarStateChange()`.** They send to Hotjar only while consent is granted. Calls made before consent are dropped, not sent later.
