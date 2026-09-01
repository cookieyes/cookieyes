<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/cookieyes/cookieyes/main/.github/assets/banner-dark.svg">
    <img src="https://raw.githubusercontent.com/cookieyes/cookieyes/main/.github/assets/banner-light.svg" alt="CookieYes consent banner — localized with @cookieyes/translations" width="820">
  </picture>
</p>

<h1 align="center">@cookieyes/translations</h1>

<p align="center"><strong>Curated, per-locale translation catalog for the CookieYes SDK.</strong></p>

<p align="center">Ready-made banner, preferences, and opt-out copy in five languages. Each locale is its own sub-path export, so importing one never bundles the others.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@cookieyes/translations"><img src="https://img.shields.io/npm/v/@cookieyes/translations" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@cookieyes/translations"><img src="https://img.shields.io/npm/dw/@cookieyes/translations" alt="npm downloads"></a>
  <a href="https://github.com/cookieyes/cookieyes/actions/workflows/ci.yml"><img src="https://github.com/cookieyes/cookieyes/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/@cookieyes/translations" alt="license"></a>
</p>

---

> This package only provides locale strings — for which API to use to read
> consent status, see the [shared decision tree](https://github.com/cookieyes/cookieyes/blob/main/apps/web/content/docs/getting-started/which-api.mdx).

## Key features

- **Five locales** — English (`en`), Spanish (`es`), French (`fr`), German (`de`), Italian (`it`).
- **Tree-shakeable** — per-locale sub-path exports; import one language, ship only that one.
- **Complete `TranslationMap`** — every string the banner, preferences dialog, and opt-out use.
- **Drop-in** — pass straight to `initCookieYes({ i18n: { messages } })`; no adapter needed.

## Prerequisites

- **Node.js** ≥ 20
- A CookieYes SDK package to consume the strings — [`@cookieyes/core`](https://github.com/cookieyes/cookieyes/tree/main/sdk/core), [`@cookieyes/react`](https://github.com/cookieyes/cookieyes/tree/main/sdk/react), or [`@cookieyes/nextjs`](https://github.com/cookieyes/cookieyes/tree/main/sdk/nextjs).

## Quick start

**1. Install**

```bash
npm install @cookieyes/translations
pnpm add @cookieyes/translations
yarn add @cookieyes/translations
bun add @cookieyes/translations
```

**2. Import the locales you need** (each is a **named** export):

```ts
import { en } from "@cookieyes/translations/en";
import { fr } from "@cookieyes/translations/fr";
```

**3. Pass them to the SDK** via `initCookieYes`:

```ts
import { initCookieYes } from "@cookieyes/react"; // or @cookieyes/core / @cookieyes/nextjs

initCookieYes({
  mode: "cookie-only", // no backend
  i18n: {
    messages: { en, fr },
    locale: "fr", // active locale; omit to auto-detect from the browser
  },
});
```

**4. Done.** The banner and dialogs now render in the selected locale.

## Available locales

| Sub-path | Language |
|----------|----------|
| `@cookieyes/translations/en` | English |
| `@cookieyes/translations/es` | Spanish |
| `@cookieyes/translations/fr` | French |
| `@cookieyes/translations/de` | German |
| `@cookieyes/translations/it` | Italian |

The package root (`@cookieyes/translations`) re-exports **shared types only** — locale tables
are not re-exported there, so importing one language never pulls in the others.

## Troubleshooting

**`Cannot find module '@cookieyes/translations'` (or a locale sub-path).**
Import from the **sub-path**, not the root: `@cookieyes/translations/fr`, not
`@cookieyes/translations`. The root exports types only. Available sub-paths are `en`, `es`, `fr`,
`de`, `it` — any other path won't resolve.

**Text doesn't change after I pass a locale.**
Make sure the imported locale is actually placed in `i18n.messages` **and** selected via
`i18n.locale` (e.g. `{ messages: { en, fr }, locale: "fr" }`). If you only pass `messages`
without `locale`, the SDK auto-detects from the browser and may not pick the one you expect. The
runtime is a singleton — changing the config after the first `initCookieYes(...)` call has no
effect until the runtime is reset.

Still stuck? [Open an issue](https://github.com/cookieyes/cookieyes/issues).

## Community & support

- [Open an issue](https://github.com/cookieyes/cookieyes/issues) — bug reports and feature requests.
- Email — [support@cookieyes.com](mailto:support@cookieyes.com).
- [Full documentation](https://github.com/cookieyes/cookieyes/blob/main/apps/web/content/docs/getting-started/configuration.mdx).

_(A community chat channel is on the roadmap.)_

## Contributing

Contributions are welcome — new locales especially. Read our
[Contributing Guidelines](https://github.com/cookieyes/cookieyes/blob/main/CONTRIBUTING.md) and
[Code of Conduct](https://github.com/cookieyes/cookieyes/blob/main/CODE_OF_CONDUCT.md), then open
a pull request.

### Security

Found a vulnerability? **Do not open a public issue** — follow our
[Security Policy](https://github.com/cookieyes/cookieyes/blob/main/SECURITY.md) and use GitHub's
private vulnerability reporting.

## License

MIT — see [LICENSE](./LICENSE).
