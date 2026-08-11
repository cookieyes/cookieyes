import { type CategoryDef, getOrCreateConsentRuntime } from "@cookieyes/core";
import { createSharedHarness, setupHarness } from "./harness-shared.js";
import { resetConsentTestState } from "./reset.js";
import type {
  CategoryIdOf,
  ConsentTest,
  ConsentTestOptions,
  DefaultCategoryDefs,
} from "./types.js";

/**
 * Build a headless consent environment backed by the **real** engine.
 *
 * Every decision here runs through `@cookieyes/core`'s own `ConsentManager` and
 * `ConsentStore`: required-category enforcement, CCPA opt-out defaults, taxonomy
 * hashing, cookie serialization, and the save-vs-change event split are inherited,
 * not reimplemented. That is the point — a second copy of those rules would be
 * free to drift, and a test passing against drifted rules is worse than no test.
 *
 * What this function adds is only ergonomics: a guaranteed-clean slate, headless
 * seeding, a closed category union so typos fail to compile, and recorders for the
 * signals a test wants to assert on.
 *
 * ```ts
 * const consent = createConsentTest({ initialConsent: { analytics: true } });
 * expect(consent.has("analytics")).toBe(true);
 * consent.deny("analytics");           // the visitor changes their mind
 * expect(consent.has("analytics")).toBe(false);
 * consent.teardown();
 * ```
 *
 * Testing React components instead? Use `createReactConsentTest` from
 * `@cookieyes/test/react`. It drives `@cookieyes/react`'s runtime, which is a
 * **separate** engine from this one — never mount both in the same test.
 */
export function createConsentTest<const C extends readonly CategoryDef[] = DefaultCategoryDefs>(
  options: ConsentTestOptions<C> = {},
): ConsentTest<CategoryIdOf<C>> {
  // Run first, unconditionally: a suite that forgot a teardown somewhere else
  // still gets a clean engine here rather than inheriting stale consent.
  resetConsentTestState();

  const { resolved, recorder, ready, config, googleConsentMode } = setupHarness(options);
  const { consentManager, consentStore } = getOrCreateConsentRuntime(config);

  const base = createSharedHarness<CategoryIdOf<C>>({
    manager: consentManager,
    on: (type, listener, opts) => consentStore.on(type, listener, opts),
    resolved,
    recorder,
    ready,
    googleConsentMode,
    teardown: resetConsentTestState,
    // Core is framework-free — there is nothing to batch or flush.
    wrap: (fn) => fn(),
  });

  return { ...base, store: consentStore };
}
