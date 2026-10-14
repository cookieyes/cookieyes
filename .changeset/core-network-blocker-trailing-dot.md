---
"@cookieyes/core": patch
---

The network blocker now stops requests to a denied domain even when the hostname is written with a trailing dot.

**What was wrong.** `https://www.google-analytics.com./collect` is the same host as `https://www.google-analytics.com/collect`, but the blocker compared hostnames as plain text, so the trailing-dot form did not match a `google-analytics.com` rule. A script on the page could send `fetch`, `XMLHttpRequest` or `navigator.sendBeacon` requests to a denied domain before consent.

**What changed.** Trailing dots are removed from both the request hostname and the rule's `domain` before matching. A rule written as `google-analytics.com.` now matches too. Hosts that only start with the domain, such as `google-analytics.com.example.test`, are still not matched. No configuration change is needed.
