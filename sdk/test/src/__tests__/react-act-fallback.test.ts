// @vitest-environment jsdom
//
// Covers the React 18.0–18.2 path: `act` only moved onto the `react` package in
// 18.3, and our peer range starts at 18.0. The README promises the harness still
// works there, so the promise is tested rather than asserted.
//
// `react` is mocked with `act: undefined` for this file only. Nothing renders
// here, so no renderer needs the real thing.
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, act: undefined };
});

const { createReactConsentTest, resetReactConsentTestState } = await import("../react-harness.js");

afterEach(resetReactConsentTestState);

describe("without React's act() available", () => {
  it("still seeds, mutates and reads consent", () => {
    const consent = createReactConsentTest({ initialConsent: { analytics: true } });

    expect(consent.has("analytics")).toBe(true);

    consent.deny("analytics");
    expect(consent.has("analytics")).toBe(false);

    consent.acceptAll();
    expect(consent.has("analytics")).toBe(true);
    expect(consent.events("change").length).toBeGreaterThan(0);
  });

  it("leaves IS_REACT_ACT_ENVIRONMENT untouched when it cannot flush", () => {
    const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean | undefined };
    const before = scope.IS_REACT_ACT_ENVIRONMENT;

    const consent = createReactConsentTest();
    consent.acceptAll();

    expect(scope.IS_REACT_ACT_ENVIRONMENT).toBe(before);
  });

  it("still drives the dialog controls", () => {
    const consent = createReactConsentTest();

    consent.showPreferences();
    expect(consent.snapshot().isPreferencesOpen).toBe(true);

    consent.hidePreferences();
    expect(consent.snapshot().isPreferencesOpen).toBe(false);
  });
});
