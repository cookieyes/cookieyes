---
"@cookieyes/core": patch
"@cookieyes/react": patch
"@cookieyes/cli": patch
"@cookieyes/nextjs": patch
"@cookieyes/translations": patch
---

Point every documentation link at the published documentation site.

Three deprecation warnings previously gave a reader nowhere useful to go: the `mode: "offline"` rename and the `builtInIntegrations` warning carried no link at all, and the builder deprecation pointed at a raw Markdown file in the GitHub repository. All three now link to the published migration guide.

The package READMEs linked to a repository copy of the "Which API should I use?" decision tree that had drifted out of date — it still told Next.js users to read server-side consent with `parseCookie()` from `@cookieyes/core`, when the correct API is `getServerConsent()` from `@cookieyes/nextjs/server`. Every README now links to the published page, and the repository copy is a pointer rather than a second source of truth.

Documentation links only; no behaviour or API changes.
