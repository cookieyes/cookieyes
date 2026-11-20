import { render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRegion } from "../hooks/useRegion.svelte.js";
import HookProbe from "./fixtures/HookProbe.svelte";
import { clearCookie, cookieOnly, renderHook, unmountAll } from "./test-utils.js";

const map = { "US-CA": "CCPA", DE: "GDPR" } as const;

// The field names of React's useRegion() (a RegionDecision), listed explicitly.
const REACT_FIELDS = ["region", "regulation", "source", "confidence"];

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useRegion", () => {
  it("returns the same field names as React's useRegion", () => {
    const { result } = renderHook(() => useRegion(), cookieOnly());
    expect(Object.keys(result)).toEqual(REACT_FIELDS);
  });

  it("resolves the regulation from the detected region", () => {
    const config = { mode: "cookie-only", region: { detect: () => "US-CA", map } } as const;
    expect(renderHook(() => useRegion(), config).result).toMatchObject({
      region: "US-CA",
      regulation: "CCPA",
      source: "detected",
    });
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
  });

  it("throws the one error when the provider is missing", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(() => render(HookProbe, { props: { use: () => useRegion() } })).toThrow(
      "[cookieyes] useRegion() could not find CookieYes. Wrap the app in <CookieYesProvider config={...}> and call hooks while a component initialises.",
    );
  });
});
