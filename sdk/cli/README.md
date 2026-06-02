# @cookieyes/cli

Scaffolder for the [CookieYes Consent SDK](https://github.com/cookieyes/cookieyes). It
detects your framework and package manager, installs the right `@cookieyes/*` packages,
and wires up the provider and banner for you.

## Usage

Run it in an existing project — no install required:

```bash
npx @cookieyes/cli init
```

Or with your package manager's equivalent:

```bash
pnpm dlx @cookieyes/cli init
yarn dlx @cookieyes/cli init
```

## What it does

- Detects whether you're using **React** or **Next.js (App Router)**.
- Detects your package manager (npm / pnpm / yarn / bun).
- Installs the matching adapter (`@cookieyes/react` or `@cookieyes/nextjs`).
- Patches your app entry / layout to mount the consent provider and banner.

## License

[MIT](https://github.com/cookieyes/cookieyes/blob/main/LICENSE) © CookieYes
