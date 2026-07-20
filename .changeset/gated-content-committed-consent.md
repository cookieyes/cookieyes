---
"@cookieyes/core": patch
"@cookieyes/react": patch
"@cookieyes/nextjs": patch
---

Gate consent-driven content on committed decisions, not live toggles.

Scripts, embeds, and the network blocker now react only to a saved decision
(Accept All / Reject All / Save Preferences), not to an in-progress switch in
the open preferences dialog — so nothing loads before the visitor actually
consents. Once loaded, gated content stays until the next page load rather than
being torn down live on revoke (matching hosted CookieYes).

- `useConsentCategory` and the store's `has()` now read committed consent; the
  new `committedConsents` (store) / `committedCategories` (manager) expose it.
  `consents` / `categories` stay live to drive the dialog checkboxes.
- `GatedFrame` latches once shown; an injected `GatedScript` is no longer removed
  on revoke — re-blocking applies on the next page load.
