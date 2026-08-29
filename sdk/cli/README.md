<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/cookieyes/cookieyes/main/.github/assets/banner-dark.svg">
    <img src="https://raw.githubusercontent.com/cookieyes/cookieyes/main/.github/assets/banner-light.svg" alt="CookieYes consent banner scaffolded by @cookieyes/cli" width="820">
  </picture>
</p>

<h1 align="center">@cookieyes/cli</h1>

<p align="center"><strong>The fastest path to your first consent banner.</strong></p>

<p align="center">One command detects your framework and package manager, installs the right adapter, and scaffolds a working consent manager — no manual wiring.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@cookieyes/cli"><img src="https://img.shields.io/npm/v/@cookieyes/cli" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@cookieyes/cli"><img src="https://img.shields.io/npm/dw/@cookieyes/cli" alt="npm downloads"></a>
  <a href="https://github.com/cookieyes/cookieyes/actions/workflows/ci.yml"><img src="https://github.com/cookieyes/cookieyes/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/@cookieyes/cli" alt="license"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#commands">Commands</a> ·
  <a href="#what-to-expect">Expected output</a> ·
  <a href="#troubleshooting">Troubleshooting</a>
</p>

---

> Once scaffolded, see the [decision tree](https://developer.cookieyes.com/docs/getting-started/which-api)
> for which API to use to read consent status in your code.

## Why use the CLI?

Setting up consent by hand means installing the right package, creating a `"use client"`
consent-manager module, calling `initCookieYes(...)`, and mounting the components in your
layout or entry file. The CLI does all of that in ~30 seconds:

- **Detects your framework** — Next.js (App or Pages Router), React (Vite/CRA), or vanilla JS.
- **Detects your package manager** — npm, pnpm, yarn, or bun.
- **Installs the right adapter** — `@cookieyes/nextjs`, `@cookieyes/react`, or `@cookieyes/core`.
- **Scaffolds a working consent manager** — using the canonical `initCookieYes({...})` config, so
  freshly generated code is already on the current API (no deprecation warnings).
- **Wires it in** — patches your `layout.tsx` / `_app.tsx` / entry file to render the banner.

Prefer to wire it yourself? Every adapter README has a manual quick start.

## Prerequisites

- **Node.js** ≥ 20
- An existing project (Next.js, React, or vanilla). The CLI adds consent to a project you
  already have — it does not scaffold a new app.

## Quick start

Run it with your package manager's "dlx" runner — no global install needed:

```bash
npx @cookieyes/cli init      # npm
pnpm dlx @cookieyes/cli init # pnpm
yarn dlx @cookieyes/cli init # yarn
bunx @cookieyes/cli init     # bun
```

`init` is the default command, so `npx @cookieyes/cli` (no argument) does the same thing.

## Commands

| Command | Description |
|---------|-------------|
| `init` | **(default)** Set up the CookieYes SDK in the current project — detect, install, scaffold, and wire in the consent manager. |

### Global flags

| Flag | Description |
|------|-------------|
| `-v`, `--version` | Print the CLI version and exit. |
| `-h`, `--help` | Print usage and the command list. |

## What to expect

`init` is interactive. It asks a short series of questions, then reports every file it creates
or edits so you can confirm it worked:

```text
$ npx @cookieyes/cli init

  CookieYes

◆  Which framework are you using?
│  ● Next.js (detected)
│  ○ React
│  ○ Vanilla JS / Other
│
◆  Backend mode?
│  ● Cookie-only — no backend — stored in a browser cookie
│  ○ Self-hosted — sync consent to your backend
│
◆  Which privacy regulation applies?
│  ● GDPR — European Union — opt-in
│  ○ CCPA — California / US — opt-out
│
◆  Color scheme
│  ● Light   ○ Dark
│
◆  Extra languages? (space to toggle, English always included)
│  ◻ Spanish (es)   ◻ French (fr)   ◻ German (de)
│
◆  Install @cookieyes/nextjs now? › Yes

○  Detected src/ layout · App Router
✔  Created src/components/consent-manager/provider.tsx
✔  Created src/components/consent-manager/index.ts
✔  Updated src/app/layout.tsx
◒  Installing @cookieyes/nextjs...
✔  Installed @cookieyes/nextjs

●  Support the project
│  ★ Enjoying CookieYes? A GitHub star helps a lot:
│  https://github.com/cookieyes/cookieyes

✓ Done! Docs: https://github.com/cookieyes/cookieyes#readme
```

The generated `provider.tsx` calls `initCookieYes({ ... })` with the options you chose and
renders `<CookieBanner />`, `<CookiePreferences />`, and `<RecallButton />`.

### What happens next

1. Start your dev server. The consent banner appears on first load.
2. Review the generated `consent-manager` component and tune the `initCookieYes({...})` config —
   theming, `i18n`, self-hosted persistence. Full options:
   [Configuration](https://developer.cookieyes.com/docs/getting-started/configuration).
3. For framework-specific details (SSR, Pages Router, CCPA opt-out), see the adapter README:
   [`@cookieyes/nextjs`](https://github.com/cookieyes/cookieyes/tree/main/sdk/nextjs) ·
   [`@cookieyes/react`](https://github.com/cookieyes/cookieyes/tree/main/sdk/react).

## Telemetry

**None.** The CookieYes CLI collects **no** analytics, usage data, or telemetry of any kind.
There is nothing to opt out of — it runs entirely locally and only touches your project files.

## Troubleshooting

**My framework wasn't detected.**
The CLI infers the framework from your `package.json` and project layout. If detection is wrong,
just pick the correct option at the "Which framework are you using?" prompt — the detected one is
only pre-selected, never forced. Run the CLI from your project root (where `package.json` lives).

**No files were created or modified.**
The CLI **skips generated files that already exist** and prints `… already exists — skipped` for
each. If you re-ran it, that's expected. To regenerate, remove or rename the existing
`consent-manager` files first. Note this skip applies to the files the CLI *generates*: your
layout or entry file is patched in place instead (reported as `Updated <file>`), so commit your
work before running it. If your entry/layout file couldn't be
patched automatically, the CLI prints a manual snippet to paste — follow that note.

**The banner doesn't render after install.**
Confirm `<CookieYesRoot />` was mounted in your root layout/entry (the CLI prints where it wired
it). Start the dev server and hard-reload. The banner only shows while the user hasn't acted —
clear the `cookieyes-consent` cookie. Framework-specific causes (e.g. `"use client"`) are covered
in the [adapter README's](https://github.com/cookieyes/cookieyes/tree/main/sdk/react#troubleshooting)
troubleshooting section.

Still stuck? [Open an issue](https://github.com/cookieyes/cookieyes/issues).

## Community & support

- [Open an issue](https://github.com/cookieyes/cookieyes/issues) — bug reports and feature requests.
- Email — [support@cookieyes.com](mailto:support@cookieyes.com).
- [Full documentation](https://developer.cookieyes.com/docs/getting-started/configuration).

_(A community chat channel is on the roadmap.)_

## Contributing

Contributions are welcome. Read our
[Contributing Guidelines](https://github.com/cookieyes/cookieyes/blob/main/CONTRIBUTING.md) and
[Code of Conduct](https://github.com/cookieyes/cookieyes/blob/main/CODE_OF_CONDUCT.md), then open
a pull request.

### Security

Found a vulnerability? **Do not open a public issue** — follow our
[Security Policy](https://github.com/cookieyes/cookieyes/blob/main/SECURITY.md) and use GitHub's
private vulnerability reporting.

## License

MIT — see [LICENSE](./LICENSE).
