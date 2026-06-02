import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useConsentRuntime } from "../hooks/useConsentRuntime.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("useConsentRuntime", () => {
  it("returns the mounted runtime", () => {
    const rt = mountOffline("GDPR");
    const { result } = renderHook(() => useConsentRuntime());
    expect(result.current).toBe(rt);
  });

  it("throws when no runtime is mounted", () => {
    expect(() => renderHook(() => useConsentRuntime())).toThrow(/No runtime is registered/);
  });
});
