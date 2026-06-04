import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useRegulation } from "../hooks/useRegulation.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("useRegulation", () => {
  it("defaults to DEFAULT when no runtime is mounted", () => {
    const { result } = renderHook(() => useRegulation());
    expect(result.current).toBe("DEFAULT");
  });

  it("reflects the configured GDPR regulation", () => {
    mountOffline("GDPR");
    const { result } = renderHook(() => useRegulation());
    expect(result.current).toBe("GDPR");
  });

  it("reflects the configured CCPA regulation", () => {
    mountOffline("CCPA");
    const { result } = renderHook(() => useRegulation());
    expect(result.current).toBe("CCPA");
  });
});
