import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CookieBanner } from "../presets/CookieBanner.js";
import { initCookieYes } from "../runtime.js";
import { computeThemeVars } from "../styles/tokens.js";
import { clearCookie, teardown } from "./test-utils.js";

/**
 * `useThemeVars` used to compute all twelve theme tokens in JavaScript on every
 * render, for every consumer. `cookieyes.css` already declares all twelve —
 * both the light defaults and the `prefers-color-scheme: dark` overrides — so
 * for the default configuration that work produced values the stylesheet had
 * already supplied, at the cost of shipping `computeThemeVars`, its CSS
 * sanitiser and the WCAG luminance maths to everyone.
 *
 * It now writes nothing for the default configuration, one attribute for an
 * explicit `colorScheme`, and loads the computation lazily only for a custom
 * `theme`. These tests pin all three, because the saving is only legitimate if
 * a themed consumer still ends up with exactly the values they had before.
 */

/**
 * The element `useThemeVars` writes to — Banner.Root's grouping div, which the
 * preset gives the `cy-banner-wrap` class. Not the inner `.cy-banner` card
 * (that is the one carrying `data-cy-part="banner"`).
 */
function bannerRoot(): HTMLElement {
  const el = document.querySelector<HTMLElement>(".cy-banner-wrap");
  if (!el) throw new Error("banner root not rendered");
  return el;
}

/** Inline custom properties actually set on the element, as a name → value map. */
function inlineVars(el: HTMLElement): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < el.style.length; i++) {
    const name = el.style.item(i);
    if (name.startsWith("--cy-")) out[name] = el.style.getPropertyValue(name).trim();
  }
  return out;
}

function matchMediaReturning(matches: boolean) {
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
  vi.unstubAllGlobals();
});

describe("useThemeVars — default configuration", () => {
  it("writes no inline theme variables and no scheme attribute", () => {
    vi.stubGlobal("matchMedia", matchMediaReturning(false));
    initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    render(<CookieBanner />);
    const root = bannerRoot();

    // The whole point of the split: with no `theme`, the stylesheet is already
    // right and the JavaScript has nothing to add.
    expect(inlineVars(root)).toEqual({});
    expect(root.hasAttribute("data-cy-scheme")).toBe(false);
  });

  it("still writes nothing when the device prefers dark — the @media block covers it", () => {
    vi.stubGlobal("matchMedia", matchMediaReturning(true));
    initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    render(<CookieBanner />);
    const root = bannerRoot();

    expect(inlineVars(root)).toEqual({});
    expect(root.hasAttribute("data-cy-scheme")).toBe(false);
  });
});

describe("useThemeVars — explicit colorScheme, no theme", () => {
  it('marks the container "dark" so the stylesheet can override a light-preference device', () => {
    vi.stubGlobal("matchMedia", matchMediaReturning(false));
    initCookieYes({ mode: "cookie-only", regulation: "GDPR", colorScheme: "dark" });
    render(<CookieBanner />);
    const root = bannerRoot();

    expect(root.getAttribute("data-cy-scheme")).toBe("dark");
    // The attribute is the whole mechanism — no values are computed.
    expect(inlineVars(root)).toEqual({});
  });

  it('marks the container "light" on a dark-preference device', () => {
    vi.stubGlobal("matchMedia", matchMediaReturning(true));
    initCookieYes({ mode: "cookie-only", regulation: "GDPR", colorScheme: "light" });
    render(<CookieBanner />);
    const root = bannerRoot();

    expect(root.getAttribute("data-cy-scheme")).toBe("light");
    expect(inlineVars(root)).toEqual({});
  });
});

describe("useThemeVars — custom theme", () => {
  it("applies every computed token once the deferred module resolves", async () => {
    vi.stubGlobal("matchMedia", matchMediaReturning(false));
    const theme = { primaryColor: "#8b1e3f", borderRadius: "2px" };
    initCookieYes({ mode: "cookie-only", regulation: "GDPR", theme });
    render(<CookieBanner />);
    const root = bannerRoot();

    // Deferred, so it is not there on the first paint — the attribute is,
    // which is what keeps the container in the right colour scheme meanwhile.
    expect(root.getAttribute("data-cy-scheme")).toBe("light");

    await waitFor(() => {
      expect(root.style.getPropertyValue("--cy-primary")).toBe("#8b1e3f");
    });
    // Byte-for-byte what the old synchronous path produced.
    expect(inlineVars(root)).toEqual(computeThemeVars(theme, false));
  });

  it("resolves dark-mode defaults for the tokens the theme leaves unset", async () => {
    vi.stubGlobal("matchMedia", matchMediaReturning(true));
    const theme = { primaryColor: "#8b1e3f" };
    initCookieYes({ mode: "cookie-only", regulation: "GDPR", theme });
    render(<CookieBanner />);
    const root = bannerRoot();

    expect(root.getAttribute("data-cy-scheme")).toBe("dark");
    await waitFor(() => {
      expect(root.style.getPropertyValue("--cy-bg")).toBe("#161B27");
    });
    expect(inlineVars(root)).toEqual(computeThemeVars(theme, true));
  });

  it("an explicit colorScheme still wins over the device preference", async () => {
    vi.stubGlobal("matchMedia", matchMediaReturning(true));
    const theme = { primaryColor: "#8b1e3f" };
    initCookieYes({ mode: "cookie-only", regulation: "GDPR", theme, colorScheme: "light" });
    render(<CookieBanner />);
    const root = bannerRoot();

    expect(root.getAttribute("data-cy-scheme")).toBe("light");
    await waitFor(() => {
      expect(root.style.getPropertyValue("--cy-bg")).toBe("#ffffff");
    });
    expect(inlineVars(root)).toEqual(computeThemeVars(theme, false));
  });
});
