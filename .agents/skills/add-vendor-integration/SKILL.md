---
name: add-vendor-integration
description: Add a consent-gated third-party integration (analytics, ads, session recording, chat widget) to @cookieyes/scripts, with tests, docs page, README entry and changeset. Use when asked to support a new vendor or tool.
---

# Add a vendor integration

Open lane: no issue needed. One rule above all others: **nothing loads and no cookie is set
until the gating category is granted.** If the vendor cannot be gated that way, stop and ask.

## 1. Learn the vendor's consent model

Before copying anything, find out from the vendor's documentation:

- how to load it after consent (a script URL, an init call)
- what it does when consent is withdrawn: can it be told to stop and go cookie-free
  (`onRevoke: "silence"`), does it have to be removed (`onRevoke: "remove"`), or is it harmless
  to keep (`onRevoke: "keep"`)? The three modes are defined in `sdk/core/src/integrations.ts`.
- which cookies it sets, so the docs can name them
- any vendor-side setting the user must change (Clarity needs its Cookies toggle off)

Write down the source URLs; the docs page will need the facts, not the links.

## 2. Copy the closest integration

Pick the existing file whose shape matches (`sdk/scripts/src/clarity.ts` for a script tag with a
queueing stub; `segment.ts`, `posthog.ts`, `meta.ts`, `google.ts` for others). Copy it to
`sdk/scripts/src/<vendor-id>.ts` and adapt:

- `export type <Vendor>Config` with `/** ... */` on every field; `category` and `id` are optional
  with documented defaults.
- `export function <vendor>(config): Integration` returning `id`, `category`, `version: 1`,
  `load: "afterConsent"`, `onRevoke`, `setup`.
- `setup` resolves only when the vendor has really loaded and rejects when it fails, so the
  engine's status stays truthful.
- Everything SSR-safe: return early when `window` or `document` is undefined.
- The JSDoc on the factory explains the gating behaviour, the vendor setting the user must
  change, and ends with one `@example`.

Keep the file self-contained. Do not add a shared helper unless two integrations need the same
non-trivial code today.

## 3. Export it

Add the config type and factory to `sdk/scripts/src/index.ts`, in alphabetical order like the
existing entries.

## 4. Test it

`sdk/scripts/src/__tests__/<vendor-id>.test.ts`, modelled on `clarity.test.ts` (it builds a fake
`IntegrationHost`). Cover at least:

- nothing is injected and no vendor global is called before the category is granted
- granting the category loads it once; a second grant does not load it twice
- withdrawal does what `onRevoke` promises
- a load error rejects `setup` and allows a retry
- SSR: no `window`, no crash

Run `pnpm --filter @cookieyes/scripts test`.

## 5. Document it

- Page: `apps/web/content/shared/integrations/<vendor-id>.mdx`, copied from
  `microsoft-clarity.mdx` and following `apps/web/AGENTS.md`. Frontmatter `frameworks: [nextjs,
  react, core]`. Sections: lead paragraph, "Set it up", "Options", "Good to know", "Common
  mistakes", "Next steps".
- Add the page to `apps/web/content/shared/integrations/meta.json` under "Ready-made
  integrations", and to `ENABLED_FILES` in `apps/web/scripts/check-examples.mjs` so its examples
  are type-checked.
- Add a card to `apps/web/content/shared/integrations/index.mdx`. If a logo is needed, add an
  SVG to `apps/web/public/figma-logos/` only if its licence allows redistribution.
- Add a row to the table and a section in `sdk/scripts/README.md`, matching the existing ones.
- Other places list the integrations by name. Find them all with
  `grep -rli clarity apps/web/content apps/web/src sdk/*/README.md` and add yours to each list.
- Regenerate: `pnpm --filter @cookieyes/web generate:framework-docs`, then `pnpm build` and
  `pnpm build:web`.

## 6. Size and changeset

- Do not run `pnpm size`: the measurement covers `core`, `react` and `nextjs` only, and
  `@cookieyes/scripts` is not part of it. Keep the integration small anyway; a consumer ships every
  byte of it.
- Changeset for `@cookieyes/scripts`, bump `minor`. Follow the `write-changeset` guide. Mention
  the vendor setting the user must change.

## 7. Finish

Run the checklist in the root `AGENTS.md`. Commit as `feat(scripts): add <vendor> integration`.
