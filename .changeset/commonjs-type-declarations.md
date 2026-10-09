---
"@cookieyes/core": patch
"@cookieyes/react": patch
"@cookieyes/nextjs": patch
"@cookieyes/scripts": patch
"@cookieyes/translations": patch
"@cookieyes/test": patch
"@cookieyes/devtools": patch
---

TypeScript projects that load the SDK with `require` now get type declarations that match the CommonJS build.

**What was wrong.** Every package shipped one `.d.ts` file for both `import` and `require`. The packages are `"type": "module"`, so TypeScript read that file as ESM even when it resolved the CommonJS build. Under `"moduleResolution": "node16"` or `"nodenext"` in a CommonJS project, that meant type errors or types that described the wrong module format.

**What changed.** Each entry point now also ships a `.d.cts` declaration file, and every `exports` entry names its own `types` for `import` and for `require`. Projects using `import`, or a bundler, resolve exactly the same files as before. The JavaScript is unchanged.

Measured with `pnpm size`: client JavaScript is unchanged.
