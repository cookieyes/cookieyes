---
"@cookieyes/scripts": minor
---

Add PostHog and Microsoft Clarity integrations.

- **`posthog()` / `posthogSync()`** — PostHog (`posthog-js`), consent-gated. `posthog()` loads it from a project API key; `posthogSync()` keeps consent in sync with a PostHog you already load yourself. A **required** `onReject` choice, no default: `"stop"` (loads after consent; removes the script and clears `ph_<key>_posthog` + the opt-out preference on withdrawal) or `"anonymous"` (loads immediately and counts visits cookie-free via `cookieless_mode`, opting in/out on consent change). `region: "us" | "eu"` or a custom `apiHost` for self-hosted/reverse-proxied setups. Consent is driven only by CookieYes's own record, never PostHog's `has_opted_*` check.
- **`clarity()`** — Microsoft Clarity (session recording + heatmaps), consent-gated. Loads after consent and drives Clarity's Consent v2 API — granted on consent, denied on withdrawal (`onRevoke: "silence"`); Clarity then deletes its own `_clck` / `_clsk` cookies and keeps running cookie-free, rather than being torn off the page. Requires Consent Mode on in the Clarity project.
