---
name: test-consent
description: "Unit-test code that depends on cookie consent (load a tool only after the visitor agrees, stop it on withdrawal, React components that read consent) with @cookieyes/test, in Vitest, Jest, node:test or Mocha, without a browser."
---

# Test code that depends on consent

Use this when a site uses the CookieYes packages (see the `install-consent-banner` skill) and code branches on consent: a script that loads only after "Accept", a component that shows different content per choice. `@cookieyes/test` gives the test a pretend visitor. It runs the real consent engine from `@cookieyes/core`, not a mock, in a plain Node test with no DOM, no real cookies and no network. Full reference: https://github.com/cookieyes/cookieyes/tree/main/sdk/test#readme

## 1. Install

```bash
npm install --save-dev @cookieyes/test
```

It works with any test runner and imports none of them. `@cookieyes/core` is a peer dependency, so the test runs the same engine the site ships.

## 2. Pick one harness per test file

| Code under test | Use |
| --- | --- |
| Logic on `@cookieyes/core` | `createConsentTest()` from `@cookieyes/test` |
| React components, or logic on `@cookieyes/react` or `@cookieyes/nextjs` | `createReactConsentTest()` from `@cookieyes/test/react` |

Never mount both in one file. They are two engines that agree at the start and drift apart on the first change.

## 3. Test logic

Code under test, and its test:

```ts title="src/analytics.ts"
import { getOrCreateConsentRuntime } from "@cookieyes/core";

export function setupAnalytics(): { started: boolean } {
  const { consentStore } = getOrCreateConsentRuntime({ mode: "cookie-only" });
  const state = { started: false };
  consentStore.on("change", ({ categories }) => {
    state.started = categories.analytics === true;
  });
  return state;
}
```

```ts title="src/analytics.test.ts"
import { createConsentTest, resetConsentTestState } from "@cookieyes/test";
import { afterEach, expect, test } from "vitest";
import { setupAnalytics } from "./analytics";

afterEach(resetConsentTestState);

test("a new visitor has agreed to nothing", () => {
  const consent = createConsentTest();
  expect(consent.snapshot().hasActed).toBe(false);
  expect(consent.has("analytics")).toBe(false);
  expect(consent.has("necessary")).toBe(true);
});

test("analytics starts on accept and stops on withdrawal", () => {
  const consent = createConsentTest();
  const analytics = setupAnalytics();

  consent.acceptAll();
  expect(analytics.started).toBe(true);

  consent.deny("analytics");
  expect(analytics.started).toBe(false);
  expect(consent.events("change").at(-1)?.changedCategories).toEqual(["analytics"]);
});
```

`consentStore.on("change", fn)` calls `fn` once right away with the current state (`isInitial: true`), so a returning visitor who accepted earlier is covered without a separate read. It returns an unsubscribe function. `consent.events("change")` leaves that first call out and lists only real decisions.

## 4. Test React components

The test needs a DOM (jsdom or happy-dom). Rendering is left to the reader's own library; this example uses Testing Library.

```tsx title="src/analytics-notice.test.tsx"
// @vitest-environment jsdom
import { useConsent } from "@cookieyes/react";
import { createReactConsentTest, resetReactConsentTestState } from "@cookieyes/test/react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

afterEach(() => {
  cleanup();
  resetReactConsentTestState();
});

function AnalyticsNotice() {
  const { categories } = useConsent();
  return <p>{categories.analytics ? "Analytics on" : "Analytics off"}</p>;
}

test("the notice follows the visitor's choice", () => {
  const consent = createReactConsentTest({ initialConsent: { analytics: true } });
  render(<AnalyticsNotice />);
  expect(screen.getByText("Analytics on")).toBeDefined();

  consent.deny("analytics");
  expect(screen.getByText("Analytics off")).toBeDefined();
});
```

In a Next.js project import `useConsent` from `@cookieyes/nextjs`. No provider wrapper is needed: the harness sets up the runtime the hooks read. Call Testing Library's `cleanup()` in `afterEach` as above; with Vitest globals off it does not unmount between tests on its own. Changes made through the harness are wrapped in `act()` already; do not wrap them again. The React harness also has `showPreferences()`, `hidePreferences()`, `showOptOut()`, `hideOptOut()` and `dismissReloadNotice()`.

## What the harness can do

| Goal | Call |
| --- | --- |
| Start as a new visitor | `createConsentTest()` with no `initialConsent` |
| Start as a returning visitor | `createConsentTest({ initialConsent: { analytics: true } })`; `{}` means they agreed to nothing |
| CCPA (opt-out, everything starts on) | `createConsentTest({ regulation: "CCPA" })` |
| Banner buttons | `acceptAll()`, `rejectAll()`, `acceptOnly(["analytics"])` |
| One category | `grant(id)`, `deny(id)`, `set(id, value)` |
| Withdraw everything | `withdrawAll()` (required categories stay on) |
| Preferences dialog checkbox, then Save | `toggle(id, value)`, then `save()` |
| Read consent | `has(id)` (committed) or `snapshot()` (`committed` and `live`) |
| Events the site's code listens to | `events("change")`, `events("save")` |
| Self-hosted consent records | `createConsentTest({ mode: "self-hosted" })`, then `backendCalls()` |
| Google Consent Mode signals | `createConsentTest({ googleConsentMode: true })`, then `googleConsent()` |
| Wait for `onConsentReady` | `await consent.whenReady()` |

## Rules that avoid wrong or flaky tests

- Reset after every test: `afterEach(resetConsentTestState)`, or `resetReactConsentTestState` for the React harness. Without it, consent leaks from one test into the next.
- Gate code on committed consent. `has()` and `snapshot().committed` change only after a decision; `toggle()` changes `snapshot().live` and commits nothing until `save()`.
- Use the `change` event to load or stop a tool. `save` also fires when the visitor confirms an unchanged choice.
- `googleConsent()` throws unless the harness was created with `googleConsentMode: true`.
- An unknown category id throws in the test, on purpose; the live site ignores it.
- Custom categories: pass `categories` to the harness. Write the array without a `CategoryDef[]` annotation (or use `satisfies readonly CategoryDef[]`), or the ids lose their types.
- Not simulated: adding scripts to the page, the network blocker and `reloadOnRevoke`. Test those in a real browser with Playwright or Cypress.
- A version warning from `@cookieyes/test` means it expects a different `@cookieyes/core` than the one installed. Align the two versions.

## Verify

1. Run the test runner: the tests pass.
2. Break the gate on purpose (for example, start analytics without checking consent) and run again: a test must fail. A test that still passes is not testing the gate.

## References

- Package README: https://github.com/cookieyes/cookieyes/tree/main/sdk/test#readme
- Fidelity table (what is exact and what is not simulated): https://github.com/cookieyes/cookieyes/tree/main/sdk/test#fidelity--limitations
