import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useRuntimeSelector } from "../hooks/useRuntimeSelector.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("useRuntimeSelector", () => {
  it("returns the fallback when no runtime is mounted", () => {
    const { result } = renderHook(() => useRuntimeSelector((s) => s.regulation, "DEFAULT"));
    expect(result.current).toBe("DEFAULT");
  });

  it("selects a slice of the snapshot from the mounted runtime", () => {
    mountOffline("GDPR");
    const { result } = renderHook(() => useRuntimeSelector((s) => s.regulation, "DEFAULT"));
    expect(result.current).toBe("GDPR");
  });

  it("re-renders with the new value when the snapshot changes", () => {
    const rt = mountOffline("GDPR");
    const { result } = renderHook(() => useRuntimeSelector((s) => s.hasActed, false));
    expect(result.current).toBe(false);
    act(() => rt.manager.acceptAll());
    expect(result.current).toBe(true);
  });
});
