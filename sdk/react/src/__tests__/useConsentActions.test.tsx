import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useConsent } from "../hooks/useConsent.js";
import { useConsentActions } from "../hooks/useConsentActions.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("useConsentActions", () => {
  it("returns safe no-ops when no runtime is mounted", () => {
    const { result } = renderHook(() => useConsentActions());
    expect(() => {
      result.current.acceptAll();
      result.current.rejectAll();
      result.current.save();
      result.current.reset();
      result.current.showPreferences();
      result.current.hideOptOut();
    }).not.toThrow();
  });

  it("acceptAll grants every category", () => {
    mountOffline("GDPR");
    const consent = renderHook(() => useConsent());
    const { result } = renderHook(() => useConsentActions());
    act(() => result.current.acceptAll());
    expect(consent.result.current.categories.advertisement).toBe(true);
  });

  it("acceptSelected grants only the chosen categories", () => {
    mountOffline("GDPR");
    const consent = renderHook(() => useConsent());
    const { result } = renderHook(() => useConsentActions());
    act(() => result.current.acceptSelected(["analytics"]));
    expect(consent.result.current.categories.analytics).toBe(true);
    expect(consent.result.current.categories.advertisement).toBe(false);
  });

  it("updateCategory toggles one category without marking acted", () => {
    mountOffline("GDPR");
    const consent = renderHook(() => useConsent());
    const { result } = renderHook(() => useConsentActions());
    act(() => result.current.updateCategory("functional", true));
    expect(consent.result.current.categories.functional).toBe(true);
    expect(consent.result.current.hasActed).toBe(false);
  });

  it("showPreferences / hidePreferences drive the dialog flag", () => {
    mountOffline("GDPR");
    const consent = renderHook(() => useConsent());
    const { result } = renderHook(() => useConsentActions());
    act(() => result.current.showPreferences());
    expect(consent.result.current.isPreferencesOpen).toBe(true);
    act(() => result.current.hidePreferences());
    expect(consent.result.current.isPreferencesOpen).toBe(false);
  });

  it("showOptOut / hideOptOut drive the opt-out flag", () => {
    mountOffline("CCPA");
    const consent = renderHook(() => useConsent());
    const { result } = renderHook(() => useConsentActions());
    act(() => result.current.showOptOut());
    expect(consent.result.current.isOptOutOpen).toBe(true);
    act(() => result.current.hideOptOut());
    expect(consent.result.current.isOptOutOpen).toBe(false);
  });

  it("reset clears consent back to defaults", () => {
    mountOffline("GDPR");
    const consent = renderHook(() => useConsent());
    const { result } = renderHook(() => useConsentActions());
    act(() => result.current.acceptAll());
    expect(consent.result.current.hasActed).toBe(true);
    act(() => result.current.reset());
    expect(consent.result.current.hasActed).toBe(false);
  });
});
