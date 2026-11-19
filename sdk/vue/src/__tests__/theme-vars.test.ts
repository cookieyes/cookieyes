import { computeThemeVars } from "@cookieyes/ui";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, shallowRef } from "vue";
import { _useThemeConfig } from "../composables/useThemeConfig.js";
import { _useThemeVars } from "../composables/useThemeVars.js";
import { CookieBanner } from "../presets/CookieBanner.js";
import { clearCookie, cookieOnly, mountWith, renderComposable, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  unmountAll();
  vi.unstubAllGlobals();
});

/** Renders a div that `_useThemeVars` themes, and lets the test destroy and recreate it. */
function themed(config: Parameters<typeof mountWith>[0]) {
  const show = shallowRef(true);
  const Comp = defineComponent({
    setup() {
      const el = shallowRef<HTMLElement | null>(null);
      const { theme, colorScheme } = _useThemeConfig("<Themed>");
      _useThemeVars(el, theme, colorScheme);
      return () => (show.value ? h("div", { ref: el, id: "themed" }) : null);
    },
  });
  return { wrapper: mountWith(config, Comp), show };
}

describe("_useThemeConfig", () => {
  it("reads the theme and colour scheme the plugin was given", () => {
    const { result } = renderComposable(() => _useThemeConfig("useThemeConfig"), {
      mode: "cookie-only",
      colorScheme: "dark",
      theme: { primaryColor: "#123456" },
    });
    expect(result).toEqual({ theme: { primaryColor: "#123456" }, colorScheme: "dark" });
  });

  it("defaults the colour scheme to system", () => {
    expect(renderComposable(() => _useThemeConfig("x"), cookieOnly()).result.colorScheme).toBe(
      "system",
    );
  });
});

describe("_useThemeVars", () => {
  it("writes nothing for the default configuration", async () => {
    themed(cookieOnly());
    await flushPromises();
    expect(document.getElementById("themed")?.hasAttribute("data-cy-scheme")).toBe(false);
  });

  it("writes the scheme attribute for an explicit colour scheme", async () => {
    themed({ mode: "cookie-only", colorScheme: "dark" });
    await flushPromises();
    expect(document.getElementById("themed")?.getAttribute("data-cy-scheme")).toBe("dark");
  });

  it("themes a node that was destroyed and created again", async () => {
    const { show } = themed({ mode: "cookie-only", colorScheme: "dark" });
    await flushPromises();
    show.value = false;
    await nextTick();
    expect(document.getElementById("themed")).toBeNull();
    show.value = true;
    await flushPromises();
    expect(document.getElementById("themed")?.getAttribute("data-cy-scheme")).toBe("dark");
  });

  it("applies a custom theme's tokens once the deferred module resolves", async () => {
    themed({ mode: "cookie-only", colorScheme: "light", theme: { primaryColor: "#123456" } });
    // Polled rather than a fixed sleep: the module is a dynamic import, which takes longer when
    // every package's tests run at once.
    await vi.waitFor(() => {
      expect(document.getElementById("themed")?.getAttribute("style") ?? "").toContain("#123456");
    });
    expect(document.getElementById("themed")?.getAttribute("data-cy-scheme")).toBe("light");
  });
});

/**
 * The theme variables used to be computed in JavaScript on every render, for every consumer.
 * `cookieyes.css` already declares all twelve tokens, light defaults and dark overrides, so for
 * the default configuration that work produced values the stylesheet had already supplied. The
 * variables are now written not at all for the default configuration, as one attribute for an
 * explicit `colorScheme`, and computed lazily only for a custom `theme`. These tests pin all
 * three on the banner, because the saving is only legitimate if a themed consumer still ends up
 * with exactly the values it had before.
 */

/** The element the theme is written to: `Banner.Root`'s grouping div, not the inner card. */
function bannerRoot(): HTMLElement {
  const el = document.querySelector<HTMLElement>(".cy-banner-wrap");
  if (!el) throw new Error("banner root not rendered");
  return el;
}

/** Inline custom properties actually set on the element, as a name to value map. */
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

async function mountBanner(config: Parameters<typeof mountWith>[0], prefersDark: boolean) {
  vi.stubGlobal("matchMedia", matchMediaReturning(prefersDark));
  mountWith(config, CookieBanner);
  await flushPromises();
  return bannerRoot();
}

describe("theme variables on the banner: default configuration", () => {
  it("writes no inline theme variables and no scheme attribute", async () => {
    const root = await mountBanner(cookieOnly(), false);
    expect(inlineVars(root)).toEqual({});
    expect(root.hasAttribute("data-cy-scheme")).toBe(false);
  });

  it("still writes nothing when the device prefers dark: the @media block covers it", async () => {
    const root = await mountBanner(cookieOnly(), true);
    expect(inlineVars(root)).toEqual({});
    expect(root.hasAttribute("data-cy-scheme")).toBe(false);
  });
});

describe("theme variables on the banner: explicit colorScheme, no theme", () => {
  it('marks the container "dark" so the stylesheet can override a light-preference device', async () => {
    const root = await mountBanner(
      { mode: "cookie-only", regulation: "GDPR", colorScheme: "dark" },
      false,
    );
    expect(root.getAttribute("data-cy-scheme")).toBe("dark");
    // The attribute is the whole mechanism: no values are computed.
    expect(inlineVars(root)).toEqual({});
  });

  it('marks the container "light" on a dark-preference device', async () => {
    const root = await mountBanner(
      { mode: "cookie-only", regulation: "GDPR", colorScheme: "light" },
      true,
    );
    expect(root.getAttribute("data-cy-scheme")).toBe("light");
    expect(inlineVars(root)).toEqual({});
  });
});

describe("theme variables on the banner: custom theme", () => {
  it("applies every computed token once the deferred module resolves", async () => {
    const theme = { primaryColor: "#8b1e3f", borderRadius: "2px" };
    const root = await mountBanner({ mode: "cookie-only", regulation: "GDPR", theme }, false);

    // Deferred, so not there on the first paint. The attribute is, which keeps the container in
    // the right colour scheme meanwhile.
    expect(root.getAttribute("data-cy-scheme")).toBe("light");

    await vi.waitFor(() => {
      expect(root.style.getPropertyValue("--cy-primary")).toBe("#8b1e3f");
    });
    expect(inlineVars(root)).toEqual(computeThemeVars(theme, false));
  });

  it("resolves dark-mode defaults for the tokens the theme leaves unset", async () => {
    const theme = { primaryColor: "#8b1e3f" };
    const root = await mountBanner({ mode: "cookie-only", regulation: "GDPR", theme }, true);

    expect(root.getAttribute("data-cy-scheme")).toBe("dark");
    await vi.waitFor(() => {
      expect(root.style.getPropertyValue("--cy-bg")).toBe("#161B27");
    });
    expect(inlineVars(root)).toEqual(computeThemeVars(theme, true));
  });

  it("an explicit colorScheme still wins over the device preference", async () => {
    const theme = { primaryColor: "#8b1e3f" };
    const root = await mountBanner(
      { mode: "cookie-only", regulation: "GDPR", theme, colorScheme: "light" },
      true,
    );

    expect(root.getAttribute("data-cy-scheme")).toBe("light");
    await vi.waitFor(() => {
      expect(root.style.getPropertyValue("--cy-bg")).toBe("#ffffff");
    });
    expect(inlineVars(root)).toEqual(computeThemeVars(theme, false));
  });

  it("keeps the variables when the banner moves into the portal root", async () => {
    const theme = { primaryColor: "#8b1e3f" };
    const root = await mountBanner({ mode: "cookie-only", regulation: "GDPR", theme }, false);
    await vi.waitFor(() => {
      expect(root.style.getPropertyValue("--cy-primary")).toBe("#8b1e3f");
    });
    expect(root.closest("#cookieyes-portal-root")).not.toBeNull();
  });
});
