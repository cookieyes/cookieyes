# @cookieyes/test

## 0.1.3

### Patch Changes

- ab99460: TypeScript projects that load the SDK with `require` now get type declarations that match the CommonJS build.

  **What was wrong.** Every package shipped one `.d.ts` file for both `import` and `require`. The packages are `"type": "module"`, so TypeScript read that file as ESM even when it resolved the CommonJS build. Under `"moduleResolution": "node16"` or `"nodenext"` in a CommonJS project, that meant type errors or types that described the wrong module format.

  **What changed.** Each entry point now also ships a `.d.cts` declaration file, and every `exports` entry names its own `types` for `import` and for `require`. Projects using `import`, or a bundler, resolve exactly the same files as before. The JavaScript is unchanged.

  Measured with `pnpm size`: client JavaScript is unchanged.

- eba2cd3: The packages are smaller to install, and debugging into them works as before.

  **What changed.** Every sourcemap used to carry its own copy of the original source, once for the ESM build and again for the CommonJS build. The source now ships once, as the package's `src/` folder (tests excluded), and the sourcemaps point at it. Stack traces and debuggers show the same files and lines as before. Nothing resolves `src/` through `exports`, so imports are unchanged.

  Measured with `pnpm size`, together with the CommonJS type declarations in this release: client JavaScript is unchanged. The packed tarball of `@cookieyes/core` is now 140.52 KB (483.49 KB unpacked), `@cookieyes/react` 147.37 KB (501.13 KB) and `@cookieyes/nextjs` 32.28 KB (155.17 KB). A full install of `@cookieyes/nextjs` with its dependencies is 370.69 KB.

## 0.1.2

### Patch Changes

- 8d7036c: The README on npm now opens with the CookieYes banner, like the other packages.

  Documentation only; no behaviour change.

## 0.1.1

### Patch Changes

- 8459865: The READMEs now link to the documentation site, [developers.cookieyes.com](https://developers.cookieyes.com). Their "Docs", "Configuration" and "Which API should I use?" links pointed at Markdown files on GitHub that had moved, so they no longer opened anything; they now open the matching page on the site, for the package's own framework. No code change.

## 0.1.0

### Minor Changes

- 6ecb81d: New package: `@cookieyes/test` — a headless test double for unit-testing consent-dependent code.

  Install it as a dev dependency and you get a pretend visitor whose consent behaves exactly like a real one, in a plain Node test — no browser, no real cookies, no network, and no test-runner lock-in (Vitest, Jest, `node:test` and Mocha all work; the package imports none of them).

  It is not a mock. It runs `@cookieyes/core`'s own engine, so category rules, required-category enforcement, CCPA opt-out defaults, taxonomy invalidation, cookie serialization, and the `save`/`change` event split are inherited rather than reimplemented — they cannot drift out of step with production.

  - `createConsentTest({ initialConsent })` — seed what the visitor already agreed to (brand-new, partial, or everything), then `grant`/`deny`/`acceptAll`/`rejectAll`/`acceptOnly`/`withdrawAll` mid-test to check what happens when they change their mind. `toggle()`/`save()` model the preferences dialog's uncommitted-checkbox state.
  - Misspelled category ids are a **compile error**, and a descriptive runtime throw listing the valid ids if one slips past the type checker — stricter than production, where an unknown id is deliberately ignored.
  - `events()`, `snapshots()`, `backendCalls()`, `on()`, `subscribe()` and `whenReady()` expose every signal the SDK sends, not just "a choice changed". Self-hosted mode captures the `ConsentPayload` that would have been POSTed instead of sending it, so no `fetch` stubbing is needed.
  - Every run starts completely clean: `resetConsentTestState()` returns the runtime and all five module-level registries to their pristine state in dependency order, and `createConsentTest()` runs it on entry so a forgotten teardown elsewhere can't leak.
  - **`@cookieyes/test/react`** brings the identical harness to React components. `@cookieyes/react` registers its own engine rather than consuming core's singleton, so `createReactConsentTest()` drives _that_ runtime — meaning `useConsent()`, `<CookieBanner />` and every hook read the state you seed. It adds `runtime`, `showPreferences()`/`hidePreferences()`, `showOptOut()`/`hideOptOut()` and `dismissReloadNotice()`, and reports `isPreferencesOpen`/`isOptOutOpen`/`reloadNotice` on `snapshot()`. Mutations are wrapped in `act()` for you, so a mounted component has re-rendered before the next assertion. `react` and `@cookieyes/react` are optional peers and the main entry imports neither, so nothing changes for consumers who don't use React.
  - **Google Consent Mode is testable.** `googleConsentMode: true` makes core's real Consent Mode broadcast observable through `googleConsent()` — the load-time signal plus one per decision, with signals derived from each category's `gcm` mapping (custom taxonomies included). It is off by default because capturing it requires a minimal `window`, which also changes `payload.domain`; both are documented. `googleConsent()` throws when the option is off rather than returning an empty array that would read like "nothing was broadcast".
  - `seedConsentCookie()` is also exported from both entries for seeding without a harness.
  - **Version mismatches are caught at runtime, not only at install time.** The harness compares the installed `@cookieyes/core` version against the range it was built for and warns once, naming both versions and the consequence. A `peerDependencies` range only helps if the install respected it — a forced install or a hoisted duplicate copy slips past it. Silent on an unparseable version and on a source-linked core, so it never becomes noise. `coreVersionWarning()` and `SUPPORTED_CORE_RANGE` are exported for asserting on the rule directly.
  - The README documents the exact fidelity of every behaviour, including what is _not_ simulated (script injection, network blocker, `reloadOnRevoke`, Google Consent Mode, React rendering), and the `@cookieyes/core` version each release pairs with.
