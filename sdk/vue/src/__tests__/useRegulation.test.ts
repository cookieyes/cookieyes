import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRegion } from "../composables/useRegion.js";
import { useRegulation } from "../composables/useRegulation.js";
import { clearCookie, cookieOnly, renderComposable, unmountAll } from "./test-utils.js";

const map = { "US-CA": "CCPA", DE: "GDPR" } as const;

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useRegulation", () => {
  it("reflects the configured GDPR regulation", () => {
    expect(renderComposable(() => useRegulation(), cookieOnly("GDPR")).result.value).toBe("GDPR");
  });

  it("reflects the configured CCPA regulation", () => {
    expect(renderComposable(() => useRegulation(), cookieOnly("CCPA")).result.value).toBe("CCPA");
  });

  it("defaults to DEFAULT when none is configured", () => {
    expect(renderComposable(() => useRegulation(), { mode: "cookie-only" }).result.value).toBe(
      "DEFAULT",
    );
  });
});

describe("useRegion", () => {
  it("resolves the regulation from the detected region", () => {
    const config = { mode: "cookie-only", region: { detect: () => "US-CA", map } } as const;
    expect(renderComposable(() => useRegion(), config).result.value).toMatchObject({
      region: "US-CA",
      regulation: "CCPA",
      source: "detected",
    });
    expect(renderComposable(() => useRegulation(), config).result.value).toBe("CCPA");
  });

  it("falls back to the strictest for an unknown region", () => {
    const config = { mode: "cookie-only", region: { detect: () => "JP", map } } as const;
    expect(renderComposable(() => useRegion(), config).result.value).toMatchObject({
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
    expect(renderComposable(() => useRegion(), config).result.value).toMatchObject({
      regulation: "GDPR",
      source: "manual",
    });
    expect(renderComposable(() => useRegulation(), config).result.value).toBe("GDPR");
  });
});
