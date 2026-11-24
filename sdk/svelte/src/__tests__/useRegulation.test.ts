import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRegion } from "../hooks/useRegion.svelte.js";
import { useRegulation } from "../hooks/useRegulation.svelte.js";
import { clearCookie, cookieOnly, renderHook, unmountAll } from "./test-utils.js";

const map = { "US-CA": "CCPA", DE: "GDPR" } as const;

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useRegulation", () => {
  it("reflects the configured GDPR regulation", () => {
    expect(renderHook(() => useRegulation(), cookieOnly("GDPR")).result.current).toBe("GDPR");
  });

  it("reflects the configured CCPA regulation", () => {
    expect(renderHook(() => useRegulation(), cookieOnly("CCPA")).result.current).toBe("CCPA");
  });

  it("defaults to DEFAULT when none is configured", () => {
    expect(renderHook(() => useRegulation(), { mode: "cookie-only" }).result.current).toBe(
      "DEFAULT",
    );
  });

  it("follows the provider's regulation prop over the config's", () => {
    const { result } = renderHook(() => useRegulation(), cookieOnly("GDPR"), {
      regulation: "CCPA",
    });
    expect(result.current).toBe("CCPA");
  });
});

describe("useRegion", () => {
  it("resolves the regulation from the detected region", () => {
    const config = { mode: "cookie-only", region: { detect: () => "US-CA", map } } as const;
    expect(renderHook(() => useRegion(), config).result).toMatchObject({
      region: "US-CA",
      regulation: "CCPA",
      source: "detected",
    });
    expect(renderHook(() => useRegulation(), config).result.current).toBe("CCPA");
  });

  it("falls back to the strictest for an unknown region", () => {
    const config = { mode: "cookie-only", region: { detect: () => "JP", map } } as const;
    expect(renderHook(() => useRegion(), config).result).toMatchObject({
      regulation: "GDPR",
      source: "strictest",
      confidence: "low",
    });
  });

  it("lets a manual regulation win over detection", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const config = {
      mode: "cookie-only",
      regulation: "GDPR",
      region: { detect: () => "US-CA", map },
    } as const;
    expect(renderHook(() => useRegion(), config).result).toMatchObject({
      regulation: "GDPR",
      source: "manual",
    });
    expect(renderHook(() => useRegulation(), config).result.current).toBe("GDPR");
  });
});
