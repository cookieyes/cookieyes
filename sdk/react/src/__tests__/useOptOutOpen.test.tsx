import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useOptOutOpen } from "../hooks/useOptOutOpen.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("useOptOutOpen", () => {
  it("is closed by default", () => {
    mountOffline("CCPA");
    const { result } = renderHook(() => useOptOutOpen());
    expect(result.current).toBe(false);
  });

  it("opens and closes with the runtime", () => {
    const rt = mountOffline("CCPA");
    const { result } = renderHook(() => useOptOutOpen());
    act(() => rt.showOptOut());
    expect(result.current).toBe(true);
    act(() => rt.hideOptOut());
    expect(result.current).toBe(false);
  });
});
