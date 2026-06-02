import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useBannerVisibility } from "../hooks/useBannerVisibility.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("useBannerVisibility", () => {
  it("is visible before the user acts", () => {
    mountOffline("GDPR");
    const { result } = renderHook(() => useBannerVisibility());
    expect(result.current).toBe(true);
  });

  it("hides once the user acts", () => {
    const rt = mountOffline("GDPR");
    const { result } = renderHook(() => useBannerVisibility());
    act(() => rt.manager.acceptAll());
    expect(result.current).toBe(false);
  });

  it("hides while the preferences dialog is open", () => {
    const rt = mountOffline("GDPR");
    const { result } = renderHook(() => useBannerVisibility());
    act(() => rt.manager.showPreferences());
    expect(result.current).toBe(false);
  });

  it("is not visible when no runtime is mounted", () => {
    const { result } = renderHook(() => useBannerVisibility());
    expect(result.current).toBe(false);
  });
});
