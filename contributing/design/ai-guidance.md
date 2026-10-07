# AI guidance for SDK users

People using the SDK often let an AI coding assistant write the integration. Three things steer
that assistant: the customer skills in `skills/`, the docs site (`llms.txt`, Markdown pages,
`/.well-known/agent-skills`) and `context7.json`. An assistant that confidently writes removed
or invented API is worse than one that knows nothing, so this guidance must stay current.

## What to protect

- **One copy of each skill.** `npx skills add cookieyes/cookieyes` and the docs site both serve
  `skills/`. Do not copy a skill elsewhere; `pnpm agents:check` fails when the site's list and
  the folder disagree.
- **Contributor skills stay internal.** The `skills` CLI also searches `.agents/skills/`. Without
  `metadata.internal: true` it would offer contributor guides (changesets, size budgets) to
  users. The flag only works if the frontmatter parses as strict YAML, so a description that
  contains `: ` must be quoted; a lenient editor loads it either way, which hides the problem.
- **Skill code compiles.** `apps/web/scripts/check-examples.mjs` type-checks every `ts`/`tsx`
  fence in `skills/` against the built SDK, with no enable-list. A removed export or option
  fails `pnpm build:web`. Do not mark a fence `check="false"` to get past a real error.
- **Updated with the API.** A PR that changes a public API, config option or default updates
  `skills/` and the `context7.json` rules. The release section of `CONTRIBUTING.md` and the PR
  template say so; the type-check catches what they miss.

## Checking Context7's answers

After a change to `context7.json` or the docs it indexes, and once Context7 has re-indexed the
repository, ask it these questions. Any answer that disagrees with the docs is a bug in one or
the other: fix the docs or the rules, never leave both.

| Question | Correct answer includes | Plausible wrong answer |
| --- | --- | --- |
| Add a CookieYes consent banner to a Next.js App Router app | `@cookieyes/nextjs`, a `"use client"` consent file, `CookieBanner`, `CookiePreferences`, `RecallButton` | Calling `initCookieYes()` in the layout |
| Which stylesheet does a Next.js app import? | `@cookieyes/nextjs/styles.css` | `@cookieyes/react/styles.css` |
| Use CookieYes without a backend | `mode: "cookie-only"` | `mode: "offline"` |
| Load Google Analytics only after consent | `ga4({ measurementId, consentMode: "basic" })` in `integrations`, plus `<GoogleConsentMode />` or `bootstrapGoogleConsentMode()` | `builtInIntegrations`, a gtag snippet pasted in the HTML, or the default `"advanced"` mode, which loads the tag before consent |
| GA4 runs inside a GTM container | `googleTagManager()` only | Both `googleTagManager()` and `ga4()` |
| Gate a script with no ready-made integration | `customScript({ id, src, category })`, or an `Integration` with `load: "afterConsent"` | `load: "immediately"` |
| Use CookieYes in Vue or Svelte | `@cookieyes/core`, UI built from `consentStore` | `@cookieyes/react` |
| Opt-out consent for California | `regulation: "CCPA"` | A custom category list |
| Unit-test that analytics loads only after consent | `createConsentTest()` from `@cookieyes/test`, reset after each test | Hand-writing the consent cookie |
| Test a React component that reads consent | `createReactConsentTest()` from `@cookieyes/test/react`, one harness per file | Both harnesses in one file |
