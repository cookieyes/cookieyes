import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useForceRegion } from "../../hooks/useForceRegion.js";

function clearRegionCookie() {
  document.cookie = "__cyd_region=; max-age=0; path=/";
}

afterEach(() => {
  clearRegionCookie();
  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
});

describe("useForceRegion", () => {
  it("starts undefined when nothing is stored", () => {
    const { result } = renderHook(() => useForceRegion());
    expect(result.current.region).toBeUndefined();
  });

  it("setRegion writes both the cookie and localStorage", () => {
    const { result } = renderHook(() => useForceRegion());
    act(() => result.current.setRegion("US-CA"));
    expect(result.current.region).toBe("US-CA");
    expect(document.cookie).toContain("__cyd_region=US-CA");
    expect(window.localStorage.getItem("cyd:region")).toBe("US-CA");
  });

  it("clearRegion removes both", () => {
    const { result } = renderHook(() => useForceRegion());
    act(() => result.current.setRegion("US-CA"));
    act(() => result.current.clearRegion());
    expect(result.current.region).toBeUndefined();
    expect(document.cookie).not.toContain("__cyd_region=US-CA");
    expect(window.localStorage.getItem("cyd:region")).toBeNull();
  });

  it("rehydrates a previously-set region cookie on a fresh mount", () => {
    document.cookie = "__cyd_region=DE";
    const { result } = renderHook(() => useForceRegion());
    expect(result.current.region).toBe("DE");
  });
});
