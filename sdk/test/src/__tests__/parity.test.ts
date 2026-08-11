import {
  type CategoryDef,
  type ConsentConfig,
  type ConsentManager,
  createConsentManager,
} from "@cookieyes/core";
import { afterEach, describe, expect, it } from "vitest";
import { createConsentTest } from "../harness.js";
import { resetConsentTestState } from "../reset.js";
import { seedConsentCookie } from "../seed.js";
import type { ConsentTestOptions } from "../types.js";

afterEach(resetConsentTestState);

type Action = (manager: ConsentManager) => void;

/**
 * The central guarantee, expressed as a test: the harness must produce *identical*
 * outcomes to driving `@cookieyes/core` directly. If someone later reimplements a
 * consent rule inside this package rather than delegating, these assertions are
 * what catches it.
 */
function viaHarness(action: Action, options: ConsentTestOptions = {}): Record<string, boolean> {
  const consent = createConsentTest(options);
  action(consent.manager);
  const committed = consent.snapshot().committed;
  consent.teardown();
  return committed;
}

function viaCore(action: Action, config: ConsentConfig): Record<string, boolean> {
  resetConsentTestState();
  const manager = createConsentManager(config);
  action(manager);
  const committed = manager.committedCategories;
  resetConsentTestState();
  return committed;
}

const CUSTOM: CategoryDef[] = [
  { id: "essential", required: true },
  { id: "marketing" },
  { id: "insights" },
];

const CASES: Array<{ name: string; action: Action }> = [
  { name: "no action (fresh visitor)", action: () => undefined },
  { name: "acceptAll", action: (m) => m.acceptAll() },
  { name: "rejectAll", action: (m) => m.rejectAll() },
  { name: "acceptSelected(analytics)", action: (m) => m.acceptSelected(["analytics"]) },
  { name: "acceptSelected([])", action: (m) => m.acceptSelected([]) },
  {
    name: "updateCategory then savePreferences",
    action: (m) => {
      m.updateCategory("functional", true);
      m.savePreferences();
    },
  },
  {
    name: "revoking a required category is refused",
    action: (m) => {
      m.updateCategory("necessary", false);
      m.savePreferences();
    },
  },
  {
    name: "resetConsent after acceptAll",
    action: (m) => {
      m.acceptAll();
      m.resetConsent();
    },
  },
];

describe.each(["GDPR", "CCPA", "DEFAULT"] as const)("parity with core — %s", (regulation) => {
  it.each(CASES)("$name", ({ action }) => {
    expect(viaHarness(action, { regulation })).toEqual(viaCore(action, { regulation }));
  });
});

describe("parity with core — custom taxonomy", () => {
  it.each([
    { name: "acceptAll", action: ((m) => m.acceptAll()) as Action },
    { name: "rejectAll", action: ((m) => m.rejectAll()) as Action },
    {
      name: "acceptSelected(marketing)",
      action: ((m) => m.acceptSelected(["marketing"])) as Action,
    },
  ])("$name", ({ action }) => {
    expect(viaHarness(action, { categories: CUSTOM, regulation: "GDPR" })).toEqual(
      viaCore(action, { categories: CUSTOM, regulation: "GDPR" }),
    );
  });

  it("inherits core's fallback to the built-in five on an invalid taxonomy", () => {
    // No `required: true` anywhere — core warns and falls back. The harness must
    // follow, because it asks core to resolve the taxonomy rather than doing it.
    const consent = createConsentTest({ categories: [{ id: "marketing" }] });
    expect([...consent.categories]).toEqual([
      "necessary",
      "functional",
      "analytics",
      "performance",
      "advertisement",
    ]);
  });

  it("leaves taxonomy invalidation to core, cookie format and all", () => {
    // Seeded for one taxonomy via the exported primitive — the harness itself
    // always starts from a cleared cookie, so this is the honest way to show that
    // core, not this package, owns the taxonomyHash check.
    seedConsentCookie({ categories: CUSTOM, initialConsent: { marketing: true } });

    const manager = createConsentManager({
      regulation: "GDPR",
      categories: [{ id: "essential", required: true }, { id: "marketing" }],
    });

    // Different taxonomy → stored consent is discarded and the visitor re-asked.
    expect(manager.hasActed).toBe(false);
  });
});
