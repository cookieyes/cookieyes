# CookieYes Consent SDK

[![CI](https://github.com/cookieyes/cookieyes/actions/workflows/ci.yml/badge.svg)](https://github.com/cookieyes/cookieyes/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![npm](https://img.shields.io/npm/v/@cookieyes/core?label=%40cookieyes%2Fcore)](https://www.npmjs.com/package/@cookieyes/core)

Open-source, developer-first cookie consent SDK. The same compliance engine that powers CookieYes for 1.5M+ websites — now installable via npm.

## Packages

| Package | Description | Version |
|---------|-------------|---------|
| [`@cookieyes/core`](./sdk/core) | Headless consent engine — zero UI, zero deps | [![npm](https://img.shields.io/npm/v/@cookieyes/core)](https://www.npmjs.com/package/@cookieyes/core) |
| [`@cookieyes/react`](./sdk/react) | React adapter — components and hooks | [![npm](https://img.shields.io/npm/v/@cookieyes/react)](https://www.npmjs.com/package/@cookieyes/react) |
| [`@cookieyes/nextjs`](./sdk/nextjs) | Next.js App Router adapter | [![npm](https://img.shields.io/npm/v/@cookieyes/nextjs)](https://www.npmjs.com/package/@cookieyes/nextjs) |
| [`@cookieyes/translations`](./sdk/translations) | Curated, per-locale translation catalog | [![npm](https://img.shields.io/npm/v/@cookieyes/translations)](https://www.npmjs.com/package/@cookieyes/translations) |
| [`@cookieyes/cli`](./sdk/cli) | Scaffolder — wire the SDK into an existing app | [![npm](https://img.shields.io/npm/v/@cookieyes/cli)](https://www.npmjs.com/package/@cookieyes/cli) |

## Architecture

```
@cookieyes/nextjs
    └── @cookieyes/react
            └── @cookieyes/core   (zero deps)
```

All business logic lives in `@cookieyes/core`. Framework adapters are thin wrappers — no logic, only wiring.

## Quick start

You configure the SDK once with a small builder, then drop in the banner and
dialog components. Both React and Next.js use the same `createCookieYes()` API.

### React

```bash
npm install @cookieyes/react
```

```tsx
// components/consent-manager.tsx
"use client";

import {
  CookieBanner,
  CookiePreferences,
  RecallButton,
  createCookieYes,
} from "@cookieyes/react";

createCookieYes()
  .mode("offline")        // "offline" (cookie-only) | "self-hosted"
  .regulation("GDPR")     // "GDPR" | "CCPA"
  .colorScheme("system")  // "light" | "dark" | "system"
  .mount();

export function CookieYesRoot() {
  return (
    <>
      <CookieBanner />
      <CookiePreferences />
      <RecallButton />
    </>
  );
}
```

Render `<CookieYesRoot />` once near the root of your app.

### Next.js App Router

```bash
npm install @cookieyes/nextjs
```

Create the same `"use client"` consent-manager component (import from
`@cookieyes/nextjs` instead), then mount it in your root layout:

```tsx
// app/layout.tsx
import { CookieYesRoot } from "@/components/consent-manager";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <CookieYesRoot />
      </body>
    </html>
  );
}
```

### Scaffold into an existing project

The CLI detects your framework and package manager, installs the right adapter,
and generates the consent-manager component for you:

```bash
npx @cookieyes/cli init
```

## Repository layout

```
sdk/
  core/          @cookieyes/core         headless engine
  react/         @cookieyes/react        React components + hooks
  nextjs/        @cookieyes/nextjs       Next.js App Router adapter
  translations/  @cookieyes/translations per-locale catalog
  cli/           @cookieyes/cli          scaffolder
```

## Local development

**Prerequisites:** Node.js ≥ 18, [pnpm](https://pnpm.io) ≥ 10

```bash
git clone https://github.com/cookieyes/cookieyes.git
cd cookieyes
pnpm install
pnpm build       # build all packages (Turborepo)
pnpm test        # run the test suites (Vitest)
pnpm typecheck   # TypeScript across all packages
pnpm lint        # Biome lint + format check
pnpm dev         # watch mode for all packages
```

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and our
[Code of Conduct](./CODE_OF_CONDUCT.md) before opening a pull request. Releases are
automated with [Changesets](https://github.com/changesets/changesets) — run
`pnpm changeset` to describe your change.

## Security

To report a vulnerability, see [SECURITY.md](./SECURITY.md). Please do not open public issues for security reports.

## License

[MIT](./LICENSE) © CookieYes
