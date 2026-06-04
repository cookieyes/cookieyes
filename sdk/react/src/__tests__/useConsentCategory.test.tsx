import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useConsentCategory } from "../hooks/useConsentCategory.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("useConsentCategory", () => {
  it("is false for non-necessary categories before consent", () => {
    mountOffline("GDPR");
    const { result } = renderHook(() => useConsentCategory("analytics"));
    expect(result.current).toBe(false);
  });

  it("is true for necessary, always", () => {
    mountOffline("GDPR");
    const { result } = renderHook(() => useConsentCategory("necessary"));
    expect(result.current).toBe(true);
  });

  it("becomes true once the category is granted", () => {
    const rt = mountOffline("GDPR");
    const { result } = renderHook(() => useConsentCategory("analytics"));
    act(() => rt.manager.acceptAll());
    expect(result.current).toBe(true);
  });

  it("falls back to false when no runtime is mounted", () => {
    const { result } = renderHook(() => useConsentCategory("analytics"));
    expect(result.current).toBe(false);
  });
});
