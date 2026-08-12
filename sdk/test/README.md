# @cookieyes/test

Unit-test your consent-dependent code without a browser.

[![npm](https://img.shields.io/npm/v/@cookieyes/test)](https://www.npmjs.com/package/@cookieyes/test)
[![license](https://img.shields.io/npm/l/@cookieyes/test)](./LICENSE)

If your app does something like *"only load analytics once the visitor agreed to it"*,
that branch is worth a test. Until now testing it meant hand-writing the SDK's internal
cookie format, booting a fake browser to hold that cookie, or skipping the test.

This package gives you a pretend visitor whose consent behaves exactly like a real one —
in a plain Node test, with no DOM, no real cookies, and no network.

It is **not a mock**. It runs `@cookieyes/core`'s own consent engine. If a test passes
here, your code works — not merely that a canned answer happened to match.

```bash
npm install --save-dev @cookieyes/test
# pnpm add -D @cookieyes/test   ·   yarn add -D @cookieyes/test
```

Works with any test runner — Vitest, Jest, node:test, Mocha. This package imports none
of them.

---

## The full walkthrough

Everything below is one realistic test file: seed a starting situation, run your code,
change the visitor's mind, and assert the right thing happened.

Say this is the code under test:

```ts
// src/analytics.ts
import { getOrCreateConsentRuntime } from "@cookieyes/core";

export function setupAnalytics(): { started: boolean } {
  const { consentStore } = getOrCreateConsentRuntime({ mode: "cookie-only" });
  const state = { started: false };

  // Load when analytics is granted, stop when it is withdrawn.
  consentStore.on("change", ({ categories }) => {
    state.started = categories.analytics === true;
  });

  return state;
}
```

And this is the test:

```ts
import { afterEach, expect, test } from "vitest";
import { createConsentTest, resetConsentTestState } from "@cookieyes/test";

// One line of hygiene. Without it, the SDK's module-level singletons leak between
// tests — this is the single most common source of flaky consent tests.
afterEach(resetConsentTestState);

test("a returning visitor who already accepted analytics gets it loaded", () => {
  // 1. Set up the starting situation: they've been here before and said yes.
  const consent = createConsentTest({ initialConsent: { analytics: true } });

  expect(consent.has("analytics")).toBe(true);
  expect(consent.snapshot().hasActed).toBe(true);   // not a first-time visitor
});

test("a brand-new visitor has consented to nothing yet", () => {
  const consent = createConsentTest();

  expect(consent.snapshot().hasActed).toBe(false);
  expect(consent.has("analytics")).toBe(false);
  expect(consent.has("necessary")).toBe(true);      // required, always on
});

test("analytics stops when the visitor changes their mind mid-session", () => {
  const consent = createConsentTest({ initialConsent: { analytics: true } });

  // 2. Change consent while the test is running — not only at the start.
  consent.deny("analytics");

  expect(consent.has("analytics")).toBe(false);

  // 3. Assert on the signal your code actually listens to.
  expect(consent.events("change")).toHaveLength(1);
  expect(consent.events("change")[0]?.changedCategories).toEqual(["analytics"]);
});

test("withdrawing everything leaves only the required category on", () => {
  const consent = createConsentTest({ initialConsent: { analytics: true, advertisement: true } });

  consent.withdrawAll();

  expect(consent.snapshot().committed).toEqual({
    necessary: true,
    functional: false,
    analytics: false,
    performance: false,
    advertisement: false,
  });
});
```

### Typos fail before you run anything

```ts
const consent = createConsentTest();

consent.grant("analytcs");
//             ~~~~~~~~~~ Argument of type '"analytcs"' is not assignable to
//                        parameter of type '"necessary" | "functional" | …'
```

If it slips past the compiler (a cast, a JS file, a dynamic value), it throws at runtime
with the valid ids listed:

```
[@cookieyes/test] Unknown consent category "analytcs".
Valid categories for this harness: necessary, functional, analytics, performance, advertisement.
Pass a `categories` option to createConsentTest() if you use a custom taxonomy.
```

This is stricter than production on purpose. A live banner *ignores* an unknown id so a
config typo can never break a visitor's page; a test should shout instead of quietly
passing for the wrong reason.

---

## API

### `createConsentTest(options?)`

| Option | Default | What it does |
|---|---|---|
| `initialConsent` | omitted | What the visitor already agreed to. **Omit** for a brand-new visitor (`hasActed: false`); pass `{}` for a returning visitor who agreed to nothing. |
| `regulation` | `"GDPR"` | `"GDPR"` (opt-in), `"CCPA"` (opt-out — everything starts on), or `"DEFAULT"`. |
| `categories` | core's built-in five | Your own taxonomy. The id union narrows to *your* ids. |
| `mode` | `"cookie-only"` | `"self-hosted"` records the payloads that would be POSTed. |
| `consentId` | core's generator | Fix it for deterministic snapshot assertions. |
| `backend` | none | Your own `ConsentBackend`. Wrapped, not replaced — recorded *and* called. |
| `onConsentReady` / `onConsentUpdate` | none | Passed straight through to core. |
| `googleConsentMode` | `false` | Capture Google Consent Mode broadcasts, readable via `googleConsent()`. See the note below. |

**Reading state**

| | |
|---|---|
| `has(id)` | Is it *committed*-granted? This is what you gate code on. |
| `snapshot()` | The full state, with `committed` and `live` split out. |
| `categories` | The taxonomy ids in effect, in order. |

**Changing state**

| | |
|---|---|
| `grant(id)` · `deny(id)` · `set(id, value)` | Change one category and commit. |
| `acceptAll()` · `rejectAll()` · `acceptOnly(ids)` | The three banner buttons. |
| `withdrawAll()` | Withdraw everything at once (required categories stay on). |
| `toggle(id, value)` | Change the *working* value **without** committing — a dialog checkbox. |
| `save()` | Commit whatever `toggle()` left pending. |
| `resetVisitor()` | Back to a brand-new visitor, same harness. |

The `toggle` / `save` split is the real engine's, not a convenience: flipping a checkbox
in the preferences dialog must not load a script before the visitor hits Save. `has()`
and `snapshot().committed` read committed consent; `snapshot().live` reads the checkbox.

**Observing signals**

| | |
|---|---|
| `events(type?)` | Every `save` / `change` caused by a real decision, in order. |
| `snapshots()` | Every snapshot core pushed to subscribers (fires on toggles too). |
| `backendCalls()` | The `ConsentPayload`s that *would* have been sent. |
| `on(type, fn, opts?)` | Core's real subscription, including the `isInitial` replay. Pass `{ category }` to hear about one category. |
| `subscribe(fn)` | Core's real snapshot subscription. |
| `whenReady()` | Resolves after `onConsentReady` — production's single microtask. |
| `googleConsent()` | Every Consent Mode broadcast, oldest first (needs `googleConsentMode: true`). |

`save` fires on every save, even an unchanged re-confirm. `change` fires only when a
category actually differs — that's the one to use for "(re)load this script". `events()`
omits the one-off replay a fresh listener receives; use `on()` if you want to see it.

### Google Consent Mode

If you run GA4 or Google Ads, the signal that matters most is the Consent Mode broadcast —
and it's invisible by default, because core no-ops it without a `dataLayer`. Opt in:

```ts
const consent = createConsentTest({ googleConsentMode: true, initialConsent: { analytics: true } });

// Core broadcasts once at load, then on every decision.
const [atLoad] = consent.googleConsent();
expect(atLoad.signals.analytics_storage).toBe("granted");
expect(atLoad.signals.ad_storage).toBe("denied");

consent.acceptAll();
const updates = consent.googleConsent();
expect(updates[updates.length - 1].signals.ad_user_data).toBe("granted");
```

Signals come from each category's `gcm` mapping, so a custom taxonomy's own mapping works
too. `security_storage` is always `granted` — it isn't consentable.

**Two things to know.** It installs a minimal `window` in Node (core's broadcast needs one),
which also makes `payload.domain` the shim's hostname instead of `"unknown"`. And
`googleConsent()` **throws** when the option is off, rather than returning `[]` — an empty
array would read like "nothing was broadcast", which is exactly the wrong conclusion. Under
jsdom the real `window` is reused and any `dataLayer` you already set is restored on teardown.

**Cleanup**

`teardown()` on the harness, or `resetConsentTestState()` standalone. Either resets the
runtime, all five module-level registries, the cookie, and the document shim, in
dependency order. `createConsentTest()` also runs it on entry, so a suite that forgets a
teardown somewhere still starts clean.

### `seedConsentCookie(options?)`

Seeds prior consent without building a harness — for driving a different entry point
afterwards (see the React recipe). Same seeding options; returns the seeded snapshot, or
`null` for a brand-new visitor.

### `resetConsentTestState()`

The ordered teardown, standalone.

---

## Custom taxonomies

Your own categories narrow the types to your own ids:

```ts
const consent = createConsentTest({
  categories: [
    { id: "essential", required: true },
    { id: "marketing" },
    { id: "insights" },
  ],
  initialConsent: { marketing: true },
});

consent.grant("insights");   // ✅
consent.grant("analytics");  // ❌ compile error — not in this taxonomy
```

One caveat: annotating the array as `CategoryDef[]` erases the literal ids TypeScript
needs, and the id type falls back to core's open `ConsentCategory`. Either drop the
annotation or use `satisfies readonly CategoryDef[]` — the runtime check still catches
typos either way.

Validation is core's, not ours: a taxonomy with no `required: true` category warns and
falls back to the built-in five, here exactly as in production.

---

## Testing React components

`@cookieyes/react` registers **its own** engine — `initCookieYes` there builds a runtime
rather than consuming core's singleton. So React components need their own harness, which
is the `/react` entry point:

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { useConsent } from "@cookieyes/react";
import { createReactConsentTest, resetReactConsentTestState } from "@cookieyes/test/react";
import { afterEach, expect, test } from "vitest";

afterEach(resetReactConsentTestState);

function AnalyticsNotice() {
  const { categories } = useConsent();
  return <p>{categories.analytics ? "Analytics on" : "Analytics off"}</p>;
}

test("a returning visitor sees what they already agreed to", () => {
  const consent = createReactConsentTest({ initialConsent: { analytics: true } });

  render(<AnalyticsNotice />);
  expect(screen.getByText("Analytics on")).toBeDefined();

  consent.deny("analytics");                     // no act() wrapper needed
  expect(screen.getByText("Analytics off")).toBeDefined();
});
```

Everything from the core harness works identically — `has`, `snapshot`, `grant`/`deny`,
`acceptAll`, `withdrawAll`, `toggle`/`save`, `events()`, `backendCalls()`, `whenReady()`,
the strict category types, and the guaranteed-clean reset. Both entry points are the same
harness over a different engine, not two implementations.

Four extras only React needs:

| | |
|---|---|
| `runtime` | The real `CookieYesRuntime` your hooks and components are reading |
| `showPreferences()` · `hidePreferences()` | Drive the preferences dialog |
| `showOptOut()` · `hideOptOut()` | Drive the CCPA opt-out dialog |
| `dismissReloadNotice()` | Dismiss the reload notice |

`snapshot()` also carries `isPreferencesOpen`, `isOptOutOpen` and `reloadNotice`.

**Mutations are wrapped in `act()` for you.** React updates driven from outside a
component have to be flushed or your assertion reads stale markup, so
`consent.grant("analytics")` handles it. You don't write
`act(() => consent.grant("analytics"))`. It falls back to a plain call on React 18.0–18.2
(where `act` lived in `react-dom/test-utils`) and when nothing is rendered.

**Rendering is left to you.** This package has no `@testing-library/react` dependency, so
it works with Testing Library, a custom renderer, or none at all. Use `jsdom` or
`happy-dom` — React can't render without a DOM, and that's React's requirement, not ours.

> **Pick one harness per test file.**
>
> | Testing | Use |
> |---|---|
> | Logic on `@cookieyes/core` | `createConsentTest()` from `@cookieyes/test` |
> | React components, or logic on `@cookieyes/react` | `createReactConsentTest()` from `@cookieyes/test/react` |
>
> Mounting both gives you two engines that agree at startup and diverge on the first
> mutation — the harness would flip while your component still renders the old value.
> There's a test in this package pinning exactly that behaviour so the trap stays
> documented rather than rediscovered.

`react` and `@cookieyes/react` are **optional** peers: the main entry never imports
either, so nothing changes for consumers who don't use React.

## Fidelity & limitations

Read this table before trusting a passing test. "Exact" means the real engine ran.

| Behaviour | Fidelity | Notes |
|---|---|---|
| Accept / reject / save / select | **Exact** | Core's real `ConsentManager` |
| Required-category enforcement | **Exact** | `withdrawAll()` and `deny("necessary")` keep it on |
| CCPA opt-out defaults | **Exact** | Core's fresh-visitor state |
| Custom taxonomies + invalid-config fallback | **Exact** | Core's `resolveCategories` |
| Taxonomy-change invalidation | **Exact** | Core's taxonomy signature check |
| Cookie read / write / parse / delete | **Exact** | Core's real cookie path, over an in-memory jar |
| `save` vs `change`, `isInitial` replay, `{ category }` filter | **Exact** | Core's real emitter |
| Live vs committed split | **Exact** | `toggle()` doesn't commit; `save()` does |
| `onConsentReady` timing | **Exact** | One microtask, same as production — `await whenReady()` |
| All other timing | **Exact (synchronous)** | Production is synchronous too; no fake delays are injected, because that would *reduce* fidelity |
| Unknown category id | **Stricter** | Throws here; production silently ignores. Deliberate. |
| Seeded `lastRenewed` | **Fixed to `1`** | Keeps seeded snapshots deterministic. Core never branches on it. |
| `payload.domain` | **`"unknown"`** | Core reads `window.location.hostname`; there is no `window` in a node test. With `googleConsentMode: true` a shimmed window is in place, so it reports `cookieyes-test.local` instead |
| Backend POST | **Captured, not sent** | Assert with `backendCalls()`. No `fetch` is called, and none needs stubbing |
| Script injection | **Registry only** | Nothing is injected without a `document.head` |
| `reloadOnRevoke` | **Not simulated** | No `window`, so no reload |
| Google Consent Mode | **Opt-in** | Pass `googleConsentMode: true`, then read `googleConsent()`. It installs the minimal `window` core's broadcast needs; `googleConsent()` throws when the option is off |
| Network blocker | **Not simulated** | Needs `window` to patch `fetch`/XHR |
| A shimmed `document` exists during the test | **Caveat** | Only `document.cookie` is defined. Code that feature-detects `document` may take a browser path — use jsdom if that matters to you |
| React component rendering | **Needs jsdom** | Use `@cookieyes/test/react`; React cannot render without a DOM |

For the browser-side items, the honest answer is a real browser: use Playwright or
Cypress. This package is for the logic.

---

## Version pairing

`@cookieyes/test` declares `@cookieyes/core` as a **peer dependency**, so it runs your
installed engine rather than bundling its own — a mismatch is a real install-time
warning, not a silent drift.

| `@cookieyes/test` | `@cookieyes/core` |
|---|---|
| `0.1.x` | `>=0.3.0 <1.0.0` |

Any change to core's consent behaviour updates this package and the table above in the
same pull request, and is called out in the release notes — that's a documented rule in
[CONTRIBUTING.md](../../CONTRIBUTING.md#coding-standards), not an aspiration.

**A mismatch is also caught at runtime.** The peer range only helps if the install
respected it — a forced install, a hoisted duplicate copy of core, or a monorepo that
resolved something else all slip past it. So the harness compares `CORE_VERSION` (baked
into core at build time) against the range it was built for, and warns once:

```
[@cookieyes/test] This version of @cookieyes/test expects @cookieyes/core >=0.3.0 <1.0.0,
but the installed core is 1.0.0. Your tests are running against a different engine than
the one you ship, so a passing test may not mean what you think. Align the two — see the
compatibility table in @cookieyes/test's README.
```

It warns rather than throws — a mismatch should be loud, not fatal. It stays silent on a
version it cannot parse, and when core is linked from source (no real version to compare),
so it never becomes noise. `coreVersionWarning(version?, range?)` and
`SUPPORTED_CORE_RANGE` are exported if you want to assert on the rule yourself.

---

## License

MIT © [CookieYes](https://www.cookieyes.com)
