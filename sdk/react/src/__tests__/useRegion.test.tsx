import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRegion } from "../hooks/useRegion.js";
import { useRegulation } from "../hooks/useRegulation.js";
import { initCookieYes, resetCookieYes } from "../runtime.js";
import { clearCookie } from "./test-utils.js";

const map = { "US-CA": "CCPA", DE: "GDPR" } as const;

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  resetCookieYes();
  clearCookie();
});

describe("useRegion", () => {
  it("resolves the regulation from the detected region", () => {
    initCookieYes({ mode: "cookie-only", region: { detect: () => "US-CA", map } });

    expect(renderHook(() => useRegion()).result.current).toMatchObject({
      region: "US-CA",
      regulation: "CCPA",
      source: "detected",
    });
    // useRegulation reflects the detected regulation, unchanged in shape.
    expect(renderHook(() => useRegulation()).result.current).toBe("CCPA");
  });

  it("falls back to the strictest for an unknown region", () => {
    initCookieYes({ mode: "cookie-only", region: { detect: () => "JP", map } });
    expect(renderHook(() => useRegion()).result.current).toMatchObject({
      regulation: "GDPR",
      source: "strictest",
      confidence: "low",
    });
  });

  it("lets a manual regulation win over detection", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    initCookieYes({
      mode: "cookie-only",
      regulation: "GDPR",
      region: { detect: () => "US-CA", map },
    });

    expect(renderHook(() => useRegion()).result.current).toMatchObject({
      regulation: "GDPR",
      source: "manual",
    });
    expect(renderHook(() => useRegulation()).result.current).toBe("GDPR");
  });

  it("is SSR-safe with no runtime mounted", () => {
    const { result } = renderHook(() => useRegion());
    expect(result.current).toMatchObject({ regulation: "DEFAULT", source: "manual" });
  });
});
