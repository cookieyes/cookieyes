---
"@cookieyes/core": patch
"@cookieyes/react": patch
"@cookieyes/nextjs": patch
"@cookieyes/scripts": patch
"@cookieyes/translations": patch
"@cookieyes/test": patch
"@cookieyes/devtools": patch
---

The packages are smaller to install, and debugging into them works as before.

**What changed.** Every sourcemap used to carry its own copy of the original source, once for the ESM build and again for the CommonJS build. The source now ships once, as the package's `src/` folder (tests excluded), and the sourcemaps point at it. Stack traces and debuggers show the same files and lines as before. Nothing resolves `src/` through `exports`, so imports are unchanged.

Measured with `pnpm size`, together with the CommonJS type declarations in this release: client JavaScript is unchanged. The packed tarball of `@cookieyes/core` is now 140.52 KB (483.49 KB unpacked), `@cookieyes/react` 147.37 KB (501.13 KB) and `@cookieyes/nextjs` 32.28 KB (155.17 KB). A full install of `@cookieyes/nextjs` with its dependencies is 370.69 KB.
