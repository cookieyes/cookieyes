---
"@cookieyes/core": patch
"@cookieyes/react": patch
"@cookieyes/cli": patch
"@cookieyes/nextjs": patch
"@cookieyes/translations": patch
---

Give every documentation link a working destination.

Three deprecation warnings previously gave a reader nowhere useful to go: the `mode: "offline"` rename and the `builtInIntegrations` warning carried no link at all, and the builder deprecation pointed at a raw Markdown file in the GitHub repository. All three now link to the [migration guide](https://github.com/cookieyes/cookieyes/blob/main/apps/web/content/docs/migration.mdx).

The package READMEs linked to a repository copy of the "Which API should I use?" decision tree that had drifted out of date — it still told Next.js users to read server-side consent with `parseCookie()` from `@cookieyes/core`, when the correct API is `getServerConsent()` from `@cookieyes/nextjs/server`. Every README now links to the maintained copy, and the older repository copy is a pointer rather than a second source of truth.

Links point at the documentation sources in this repository. They will move to the documentation site once it is published.

Documentation links only; no behaviour or API changes.
