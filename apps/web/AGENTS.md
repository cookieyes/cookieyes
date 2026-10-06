# apps/web: the docs site

developers.cookieyes.com. Next.js App Router plus Fumadocs. The reader is a developer who is
deciding whether to use the SDK or is integrating it right now. Write for that person and nobody
else. The root `AGENTS.md` still applies here.

## Where things live

- `content/shared/**` is the only hand-written docs source. `content/docs/{nextjs,react,core}`
  are generated from it and committed; never edit them, the generator deletes hand-placed files.
- A page is published to each framework named in its frontmatter: `frameworks: [nextjs, react,
  core]`. A page without `frameworks:` fails the build.
- Section order: `content/shared/_root-order.json`. Pages inside a section: that folder's
  `meta.json`.
- How fenced code is rewritten per framework (`@cookieyes/react` to `@cookieyes/nextjs`,
  `"use client"` dropped, `app/` to `src/`, `frameworkSwap=false`, `<Framework when="...">`):
  `content/shared/README.md`. Read it before writing a page.
- Links are framework-relative: `/docs/hooks/use-consent`.
- The skills for SDK users live in the repo root `skills/` and are served at
  `/.well-known/agent-skills` (`src/lib/agent-skills.ts`). They are not the contributor skills
  in `.agents/skills/`. `scripts/check-examples.mjs` type-checks their code too.
- `llms.txt`, the sitemap and the changelog pages are built at request or build time from page
  metadata and the package `CHANGELOG.md` files. Do not hand-edit them.
- The announcement strip at the top of every page comes from `content/announcement.json`, or
  `null` for none. Publishing, wording and limits: `ANNOUNCEMENTS.md`; read it before editing.

## Writing rules

- Task first. The title is what the reader wants to do; the first paragraph says what the
  feature does and when to use it, in two or three sentences.
- Minimal. Only what is needed to use the feature correctly. No marketing, no history, no
  internal detail, no repetition of the README.
- Accurate. Every option, default, prop, export and behaviour you write must exist in `sdk/*/src`.
  Read the source first. Quote the default the code applies, not the one you expect.
- Follow the neighbouring page's structure. Integrations use: lead paragraph, "Set it up",
  "Options", "Good to know", "Common mistakes", "Next steps". Do not invent a new template.
- Code examples match the README and the CLI templates (`sdk/cli/src/commands/init.ts`) where
  one exists. Keep them in sync when either changes.
- Plain English. Short sentences. Active voice. Sentence-case headings.
- No em dashes (U+2014) anywhere in rendered text. Use a colon, a comma or two sentences.
  Check with `grep -rn "—" apps/web/content/shared`.
- After renaming a heading, search `content/shared` for links to its old anchor.

## Checks that fail the build

- `scripts/check-examples.mjs` type-checks every `ts` and `tsx` fence against the built SDK, once
  per framework. Use `check="false"` only for a fragment that cannot compile alone (for example a
  single `window.*` call), never to silence a real error.
- The config, component and CSS-variable reference generators fail when a sidecar entry is
  missing or stale.
- The bundle-size generator fails when `tools/size/size-report.json` is older than the SDK.

Run `pnpm build` (the SDK) and then `pnpm build:web` before saying a docs change is done.

## App code

- `src/app` is a normal App Router app. Biome extends the root config with the Next and React
  rule domains; `content/` and `.source/` are not linted.
- Landing-page copy is product copy. Change it only when asked.
