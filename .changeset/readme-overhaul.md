---
"@cookieyes/core": patch
"@cookieyes/react": patch
"@cookieyes/nextjs": patch
"@cookieyes/translations": patch
"@cookieyes/cli": patch
---

Overhaul all five package READMEs onto one consistent house template (DEVP-3).

- **Consistent structure** across core/react/nextjs/translations/cli: hero + tagline, live
  shields.io badges, key features, prerequisites, numbered quick start (all four package
  managers), inline API reference, troubleshooting, and a shared community/support/contributing/
  security footer.
- **CLI README rewritten** to best-in-class depth: why-vs-manual, the `init` command, global
  flags, a step-by-step expected-output transcript, what-happens-next, and a "no telemetry" note.
- **Troubleshooting** added to every package (top-3 failure modes each).
- **Accuracy fixes:** attribution note moved near the top of react/nextjs; pnpm/yarn/bun install
  added to translations; core links to the react/nextjs adapters; regulation coverage stated as
  GDPR + CCPA (the engine does not implement LGPD/TCF); `mode: "offline"` explained in plain
  English. All setup examples use the canonical `initCookieYes(config)` API.
- **CLI:** the post-`init` docs link now points to the GitHub README until the docs site is live.

Docs and README-facing strings only; no behavioral logic changed.
