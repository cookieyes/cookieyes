---
"@cookieyes/cli": minor
---

`init` can now run without questions, for scripts, CI and AI coding tools: pass the answers as flags.

```bash
npx @cookieyes/cli init --yes --api-url /api/consent --no-install
```

Each of `--framework`, `--mode`, `--api-url`, `--regulation`, `--color-scheme`, `--locales` and `--install` / `--no-install` answers one question, and `--yes` takes the default for the rest. With no terminal to ask in, `init` now stops with exit code 1 and names the flag it needs, instead of waiting for input that never comes. An unknown flag or value also stops it.

**Fixed: `npx @cookieyes/cli init --help` started the setup questions.** It now prints the help text and exits, as `npx @cookieyes/cli --help` already did.

**Fixed: `--version` always printed `1.0.0`.** It now prints the version of the installed package.
