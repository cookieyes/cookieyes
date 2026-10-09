# @cookieyes/devtools

## 0.1.1

### Patch Changes

- ab99460: TypeScript projects that load the SDK with `require` now get type declarations that match the CommonJS build.

  **What was wrong.** Every package shipped one `.d.ts` file for both `import` and `require`. The packages are `"type": "module"`, so TypeScript read that file as ESM even when it resolved the CommonJS build. Under `"moduleResolution": "node16"` or `"nodenext"` in a CommonJS project, that meant type errors or types that described the wrong module format.

  **What changed.** Each entry point now also ships a `.d.cts` declaration file, and every `exports` entry names its own `types` for `import` and for `require`. Projects using `import`, or a bundler, resolve exactly the same files as before. The JavaScript is unchanged.

  Measured with `pnpm size`: client JavaScript is unchanged.

- eba2cd3: The packages are smaller to install, and debugging into them works as before.

  **What changed.** Every sourcemap used to carry its own copy of the original source, once for the ESM build and again for the CommonJS build. The source now ships once, as the package's `src/` folder (tests excluded), and the sourcemaps point at it. Stack traces and debuggers show the same files and lines as before. Nothing resolves `src/` through `exports`, so imports are unchanged.

  Measured with `pnpm size`, together with the CommonJS type declarations in this release: client JavaScript is unchanged. The packed tarball of `@cookieyes/core` is now 140.52 KB (483.49 KB unpacked), `@cookieyes/react` 147.37 KB (501.13 KB) and `@cookieyes/nextjs` 32.28 KB (155.17 KB). A full install of `@cookieyes/nextjs` with its dependencies is 370.69 KB.

## 0.1.0

### Minor Changes

- 085d370: New package: `@cookieyes/devtools`, a panel for your dev server that shows what the SDK is doing and lets you test it.

  ```tsx
  import { CookieYesDevtools } from "@cookieyes/devtools";
  import "@cookieyes/devtools/styles.css";

  <CookieYesDevtools />;
  ```

  **See what the SDK is doing.** Saved and unsaved consent side by side, integration statuses, blocked requests, Google Consent Mode signals, and a searchable timeline of events that survives a reload. Open the preferences or opt-out dialog, reset consent, or download a debug file for a bug report.

  **Test without a VPN.** Force any country or US state and see the regulation it gets, and switch the banner's language live.

  **Find scripts that load without consent.** The Scanner lists third-party scripts, iframes, requests, cookies and localStorage keys, shows which ones the SDK manages, and flags anything that appeared before its category was granted or after it was withdrawn. Each unmanaged one comes with the code that would gate it.

  **Nothing reaches production.** A production build resolves an empty component and an empty stylesheet, so you can leave both imports in place. Install it as a dev dependency; it needs no flag. React and Next.js only for now, and it needs the `@cookieyes/core` and `@cookieyes/react` released alongside it.
