// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyTheme, watchPrefersDark } from "../behaviour/theme.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("applyTheme", () => {
  it("writes nothing for the default configuration", () => {
    const el = document.createElement("div");
    applyTheme(el, undefined, "system", true)();
    expect(el.hasAttribute("data-cy-scheme")).toBe(false);
    expect(el.style.length).toBe(0);
  });

  it("marks an explicit colour scheme so the stylesheet can follow it", () => {
    const el = document.createElement("div");
    applyTheme(el, undefined, "dark", false);
    expect(el.getAttribute("data-cy-scheme")).toBe("dark");
    applyTheme(el, undefined, "system", false);
    expect(el.hasAttribute("data-cy-scheme")).toBe(false);
  });

  it("applies a custom theme's variables once the theme code has loaded", async () => {
    const el = document.createElement("div");
    applyTheme(el, { primaryColor: "#7c3aed" }, "system", true);
    expect(el.getAttribute("data-cy-scheme")).toBe("dark");
    await vi.waitFor(() => expect(el.style.getPropertyValue("--cy-primary")).toBe("#7c3aed"));
    expect(el.style.getPropertyValue("--cy-bg")).toBe("#161B27");
  });

  it("does not write when cleaned up before the theme code arrives", async () => {
    const el = document.createElement("div");
    applyTheme(el, { primaryColor: "#7c3aed" }, "light", false)();
    await new Promise((r) => setTimeout(r, 20));
    expect(el.style.getPropertyValue("--cy-primary")).toBe("");
  });
});

describe("watchPrefersDark", () => {
  it("reports the current preference and every change until cleaned up", () => {
    let listener: ((e: { matches: boolean }) => void) | undefined;
    const mql = {
      matches: true,
      addEventListener: (_: string, fn: typeof listener) => {
        listener = fn;
      },
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("matchMedia", () => mql);
    const seen: boolean[] = [];
    const stop = watchPrefersDark((dark) => seen.push(dark));
    listener?.({ matches: false });
    expect(seen).toEqual([true, false]);
    stop();
    expect(mql.removeEventListener).toHaveBeenCalled();
  });

  it("does nothing where matchMedia is missing", () => {
    vi.stubGlobal("matchMedia", undefined);
    const seen: boolean[] = [];
    watchPrefersDark((dark) => seen.push(dark))();
    expect(seen).toEqual([]);
  });
});
