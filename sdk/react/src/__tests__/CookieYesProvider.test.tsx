import { cleanup, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookieYesProvider } from "../context/CookieYesProvider.js";
import { useRegion } from "../hooks/useRegion.js";
import { useRegulation } from "../hooks/useRegulation.js";
import { CookieBanner } from "../presets/CookieBanner.js";
import { clearCookie, mountCookieOnly, teardown } from "./test-utils.js";

const map = { "US-CA": "CCPA", DE: "GDPR" } as const;

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("CookieYesProvider", () => {
  it("resolves the regulation from region with no runtime mounted (SSR-safe)", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <CookieYesProvider region={{ detect: () => "US-CA", map }}>{children}</CookieYesProvider>
    );
    expect(renderHook(() => useRegulation(), { wrapper }).result.current).toBe("CCPA");
    expect(renderHook(() => useRegion(), { wrapper }).result.current).toMatchObject({
      region: "US-CA",
      regulation: "CCPA",
      source: "detected",
    });
  });

  it("supplies a fixed regulation directly", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <CookieYesProvider regulation="CCPA">{children}</CookieYesProvider>
    );
    expect(renderHook(() => useRegulation(), { wrapper }).result.current).toBe("CCPA");
  });

  it("overrides the mounted runtime's regulation for the banner (per-request display)", () => {
    // Runtime says GDPR, but the provider resolves CCPA for this request — the
    // banner must render the CCPA variant (the "Do Not Sell" action).
    mountCookieOnly("GDPR");
    render(
      <CookieYesProvider region={{ detect: () => "US-CA", map }}>
        <CookieBanner />
      </CookieYesProvider>,
    );
    expect(screen.getByText("Do Not Sell or Share My Personal Information")).toBeTruthy();
  });

  it("falls back to the runtime when no provider wraps the tree", () => {
    mountCookieOnly("CCPA");
    expect(renderHook(() => useRegulation()).result.current).toBe("CCPA");
  });
});
