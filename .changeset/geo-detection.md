---
"@cookieyes/core": minor
"@cookieyes/react": minor
"@cookieyes/nextjs": minor
---

Add optional region-based regulation (geo-detection).

- New `region` config: `detect` (return the visitor's region synchronously), `map` (region → regulation, you own it), `honorGpc` (default true), and `strictest` (default `GDPR`).
- Resolution rules: a detected region maps to your regulation; unknown/failed detection falls back to the strictest (a required banner is never skipped); the browser's GPC "do not sell" signal forces at least the CCPA opt-out; a manual `regulation` always wins (with a dev warning).
- New `useRegion()` hook (React) and `consentStore.getRegion()` (core) expose the decision: `region`, `regulation`, `source`, `confidence`. `useRegulation()` is unchanged in shape and now reflects the resolved regulation.
- Self-hosted: the detected `region` is included on the consent-log payload.

Fully optional and off by default — omit `region` and nothing changes.
