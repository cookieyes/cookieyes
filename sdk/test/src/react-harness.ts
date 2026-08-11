import type { CategoryDef } from "@cookieyes/core";
import { initCookieYes, resetCookieYes } from "@cookieyes/react";
import * as React from "react";
import { createSharedHarness, setupHarness } from "./harness-shared.js";
import type { ReactConsentTest, ReactHarnessSnapshot } from "./react-types.js";
import { resetConsentTestState } from "./reset.js";
import type { CategoryIdOf, ConsentTestOptions, DefaultCategoryDefs } from "./types.js";

/** `act` moved onto the `react` package in 18.3; older 18.x keeps it elsewhere. */
type ReactWithAct = { act?: (callback: () => void) => unknown };

/**
 * Run a consent mutation so a mounted component has re-rendered before the next
 * assertion.
 *
 * React state driven from *outside* a component must be flushed through `act()`,
 * or the update stays queued and the assertion reads stale markup — the single
 * most common source of baffling failures in this kind of test. Doing it here
 * means callers write `consent.grant("analytics")` rather than
 * `act(() => consent.grant("analytics"))` on every line.
 *
 * `IS_REACT_ACT_ENVIRONMENT` is set around the call rather than merely checked.
 * React refuses to flush (and warns) unless the flag is on, and Testing Library
 * *restores* it after each of its own `act` calls — so by the time a test body
 * runs, the flag is back to undefined. Checking it would silently skip the flush.
 * The previous value is put back so we never leave a global mutated.
 *
 * `act` moved onto the `react` package in 18.3; on 18.0–18.2 it lived in
 * `react-dom/test-utils`, so when it's missing we just call through. That's the
 * correct behaviour anyway when no component is mounted.
 */
function reactAct(fn: () => void): void {
  const act = (React as ReactWithAct).act;
  if (typeof act !== "function") {
    fn();
    return;
  }

  const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean | undefined };
  const previous = scope.IS_REACT_ACT_ENVIRONMENT;
  scope.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    // Sync callback, so act completes synchronously; the returned thenable is
    // safe to drop (Testing Library does the same for its sync wrappers).
    act(fn);
  } finally {
    scope.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}

/**
 * Reset both singletons, in order: `@cookieyes/react`'s registry first, then the
 * engine state underneath it. Safe and idempotent.
 */
export function resetReactConsentTestState(): void {
  resetCookieYes();
  resetConsentTestState();
}

/**
 * The same harness as `createConsentTest`, driving `@cookieyes/react`'s runtime
 * instead of core's — so `useConsent()`, `<CookieBanner />` and every other hook
 * and component read the state you set here.
 *
 * This exists because the two packages register **separate** engines:
 * `@cookieyes/react`'s `initCookieYes` builds its own runtime rather than
 * consuming core's singleton. Pointing the core harness at a React tree gets you
 * two engines that agree at startup and silently diverge on the first mutation.
 * This entry point mounts exactly one.
 *
 * Needs a DOM (`jsdom` / `happy-dom`) — that is React's requirement, not this
 * package's. Rendering is left entirely to you, so it works with Testing Library
 * or anything else.
 *
 * ```tsx
 * // @vitest-environment jsdom
 * const consent = createReactConsentTest({ initialConsent: { analytics: true } });
 * render(<MyWidget />);
 * expect(screen.getByText("Analytics on")).toBeDefined();
 *
 * consent.deny("analytics");                       // already wrapped in act()
 * expect(screen.getByText("Analytics off")).toBeDefined();
 * ```
 */
export function createReactConsentTest<
  const C extends readonly CategoryDef[] = DefaultCategoryDefs,
>(options: ConsentTestOptions<C> = {}): ReactConsentTest<CategoryIdOf<C>> {
  resetReactConsentTestState();

  const { resolved, recorder, ready, config, googleConsentMode } = setupHarness(options);
  // The exact config a consumer passes in their own app — no test-only shape.
  const runtime = initCookieYes(config);

  const base = createSharedHarness<CategoryIdOf<C>>({
    manager: runtime.manager,
    on: (type, listener, opts) => runtime.on(type, listener, opts),
    resolved,
    recorder,
    ready,
    googleConsentMode,
    teardown: resetReactConsentTestState,
    wrap: reactAct,
  });

  function snapshot(): ReactHarnessSnapshot<CategoryIdOf<C>> {
    const ui = runtime.getSnapshot();
    return {
      ...base.snapshot(),
      isPreferencesOpen: ui.isPreferencesOpen,
      isOptOutOpen: ui.isOptOutOpen,
      reloadNotice: ui.reloadNotice,
    };
  }

  return {
    ...base,
    runtime,
    snapshot,
    showPreferences() {
      reactAct(() => runtime.manager.showPreferences());
    },
    hidePreferences() {
      reactAct(() => runtime.manager.hidePreferences());
    },
    showOptOut() {
      reactAct(() => runtime.showOptOut());
    },
    hideOptOut() {
      reactAct(() => runtime.hideOptOut());
    },
    dismissReloadNotice() {
      reactAct(() => runtime.dismissReloadNotice());
    },
  };
}
