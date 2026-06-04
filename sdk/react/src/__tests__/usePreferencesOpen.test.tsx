import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { usePreferencesOpen } from "../hooks/usePreferencesOpen.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("usePreferencesOpen", () => {
  it("is closed by default", () => {
    mountOffline("GDPR");
    const { result } = renderHook(() => usePreferencesOpen());
    expect(result.current).toBe(false);
  });

  it("opens and closes with the manager", () => {
    const rt = mountOffline("GDPR");
    const { result } = renderHook(() => usePreferencesOpen());
    act(() => rt.manager.showPreferences());
    expect(result.current).toBe(true);
    act(() => rt.manager.hidePreferences());
    expect(result.current).toBe(false);
  });
});
