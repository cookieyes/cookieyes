import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CookieYesProvider } from "../context/CookieYesProvider.js";
import { useRegion } from "../hooks/useRegion.js";
import { useRegulation } from "../hooks/useRegulation.js";
import { CookieBanner } from "../presets/CookieBanner.js";
import { clearCookie, mountCookieOnly, teardown } from "./test-utils.js";

/** Declared locally — see the identical note in core's `deprecations.ts`. */
declare const process: { env: { NODE_ENV?: string | undefined } };

const map = { "US-CA": "CCPA", DE: "GDPR" } as const;

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
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

  describe("forcedRegion prop (server-applied forceRegion, AD-4)", () => {
    it("overrides region detection when passed, tagging the decision 'forced'", () => {
      process.env.NODE_ENV = "development";
      const wrapper = ({ children }: { children: ReactNode }) => (
        <CookieYesProvider region={{ detect: () => "DE", map }} forcedRegion="US-CA">
          {children}
        </CookieYesProvider>
      );
      expect(renderHook(() => useRegion(), { wrapper }).result.current).toMatchObject({
        region: "US-CA",
        regulation: "CCPA",
        source: "forced",
      });
    });

    it("is ignored with NODE_ENV=production, even though the prop is passed", () => {
      process.env.NODE_ENV = "production";
      const wrapper = ({ children }: { children: ReactNode }) => (
        <CookieYesProvider region={{ detect: () => "DE", map }} forcedRegion="US-CA">
          {children}
        </CookieYesProvider>
      );
      expect(renderHook(() => useRegion(), { wrapper }).result.current).toMatchObject({
        region: "DE",
        regulation: "GDPR",
        source: "detected",
      });
    });

    it("SSR: renders the forced region's banner variant server-side, no client JS involved", () => {
      // The real-world case this exists for: a devtools forceRegion override
      // set on a previous request, read server-side via getServerRegion() and
      // passed down here — must be visible in the FIRST server-rendered byte,
      // not corrected after hydration.
      process.env.NODE_ENV = "development";
      mountCookieOnly("GDPR");
      const html = renderToStaticMarkup(
        <CookieYesProvider region={{ detect: () => "DE", map }} forcedRegion="US-CA">
          <CookieBanner />
        </CookieYesProvider>,
      );
      expect(html).toContain("Do Not Sell"); // the CCPA variant, not GDPR's
    });

    it("client-side falls back to readForcedRegion() when no prop is passed (plain SPA case)", () => {
      process.env.NODE_ENV = "development";
      document.cookie = "__cyd_region=US-CA";
      const wrapper = ({ children }: { children: ReactNode }) => (
        <CookieYesProvider region={{ detect: () => "DE", map }}>{children}</CookieYesProvider>
      );
      expect(renderHook(() => useRegion(), { wrapper }).result.current).toMatchObject({
        source: "forced",
        region: "US-CA",
      });
      document.cookie = "__cyd_region=; max-age=0; path=/";
    });

    it("hydrates without a mismatch when an override cookie is set but no prop is passed", async () => {
      // The server can't see the browser's cookie without the prop, so it
      // renders the real decision. The hydrating render must match it, and
      // only then switch to the override.
      process.env.NODE_ENV = "development";
      document.cookie = "__cyd_region=US-CA";
      function Probe() {
        return <span>{useRegion().regulation}</span>;
      }
      const tree = (
        <CookieYesProvider region={{ detect: () => "DE", map }}>
          <Probe />
        </CookieYesProvider>
      );
      const container = document.createElement("div");
      container.innerHTML = renderToString(tree);
      expect(container.textContent).toBe("GDPR");

      const errors: string[] = [];
      const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
        errors.push(args.map(String).join(" "));
      });
      let root: ReturnType<typeof hydrateRoot> | undefined;
      await act(async () => {
        root = hydrateRoot(container, tree, {
          onRecoverableError: (error) => errors.push(String(error)),
        });
      });
      expect(errors.filter((message) => /hydrat/i.test(message))).toEqual([]);
      expect(container.textContent).toBe("CCPA");
      act(() => root?.unmount());
      spy.mockRestore();
      document.cookie = "__cyd_region=; max-age=0; path=/";
    });

    it("ignores a malformed override cookie instead of throwing", () => {
      process.env.NODE_ENV = "development";
      document.cookie = "__cyd_region=%E0%A4%A";
      const wrapper = ({ children }: { children: ReactNode }) => (
        <CookieYesProvider region={{ detect: () => "DE", map }}>{children}</CookieYesProvider>
      );
      expect(renderHook(() => useRegion(), { wrapper }).result.current).toMatchObject({
        region: "DE",
        source: "detected",
      });
      document.cookie = "__cyd_region=; max-age=0; path=/";
    });
  });
});

describe("CookieYesProvider devtools instrumentation", () => {
  type DevQueueEntry = { k: string; t: number; d: unknown };
  type DevGlobal = typeof globalThis & { __COOKIEYES_DEVTOOLS__?: DevQueueEntry[] };
  afterEach(() => {
    delete (globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__;
  });

  it("reports the regulation it resolved, which can differ from the runtime's", () => {
    process.env.NODE_ENV = "development";
    delete (globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__;
    mountCookieOnly("GDPR");
    render(
      <CookieYesProvider regulation="CCPA">
        <span />
      </CookieYesProvider>,
    );
    const pushed = ((globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__ ?? []).filter(
      (e) => e.k === "p",
    );
    expect(pushed[pushed.length - 1]?.d).toMatchObject({ regulation: "CCPA", source: "manual" });
  });

  it("reports nothing in production", () => {
    process.env.NODE_ENV = "production";
    delete (globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__;
    mountCookieOnly("GDPR");
    render(
      <CookieYesProvider regulation="CCPA">
        <span />
      </CookieYesProvider>,
    );
    const pushed = ((globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__ ?? []).filter(
      (e) => e.k === "p",
    );
    expect(pushed).toEqual([]);
  });
});
