---
"@cookieyes/scripts": minor
---

Ahrefs Web Analytics now loads only after analytics consent, with one line of configuration.

**New: `ahrefsAnalytics({ key })`.** Pass the `data-key` value from your Ahrefs snippet, and remove that snippet from your page. Nothing loads until the visitor grants `analytics`. When consent is withdrawn, Ahrefs stops sending page views, link clicks, form submits and custom events at once, with no reload, and starts again on re-grant.

**Your own domain.** `scriptUrl` and `apiUrl` load the script and send events through a proxy on your domain, so fewer visits are lost to ad blockers.

**Loading without consent.** `requireConsent: false` loads Ahrefs straight away and ignores consent. Use it only if your own legal advice says cookie-free analytics needs no consent on your site. The default waits for consent.

Send events with `safeCall("AhrefsAnalytics", "sendEvent", "signup")`, which does nothing before consent.
