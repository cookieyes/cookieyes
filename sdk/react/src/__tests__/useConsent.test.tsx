import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useConsent } from "../hooks/useConsent.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("useConsent", () => {
  it("returns SSR-safe defaults when no runtime is mounted", () => {
    const { result } = renderHook(() => useConsent());
    expect(result.current.hasActed).toBe(false);
    expect(result.current.regulation).toBe("DEFAULT");
    expect(result.current.categories.necessary).toBe(true);
  });

  it("reflects the mounted runtime and updates on action", () => {
    const rt = mountOffline("GDPR");
    const { result } = renderHook(() => useConsent());
    expect(result.current.regulation).toBe("GDPR");
    expect(result.current.hasActed).toBe(false);

    act(() => {
      rt.manager.acceptAll();
    });
    expect(result.current.hasActed).toBe(true);
    expect(result.current.categories.analytics).toBe(true);
  });
});
