import { afterEach, describe, expect, it, vi } from "vitest";
import { warnOnLowContrast } from "../styles/contrast-warning.js";
import { computeThemeVars } from "../styles/tokens.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("warnOnLowContrast", () => {
  it("warns once for a deliberately low-contrast --cy-text/--cy-bg pair, naming both tokens, both values, the ratio, and the threshold", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    // mutedTextColor is pinned to a value that passes comfortably against the
    // same background, so only the text/bg pair is expected to warn here.
    const vars = computeThemeVars(
      { textColor: "#f5f5f0", backgroundColor: "#fafafa", mutedTextColor: "#000000" },
      false,
    );

    warnOnLowContrast(vars, false);

    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0]?.[0] as string;
    expect(message).toContain("--cy-text");
    expect(message).toContain(vars["--cy-text"]);
    expect(message).toContain("--cy-bg");
    expect(message).toContain(vars["--cy-bg"]);
    expect(message).toContain("4.5:1");
  });

  it("warns independently for a low-contrast --cy-muted/--cy-bg pair (separate call from the text/bg check)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const vars = computeThemeVars(
      { textColor: "#000000", mutedTextColor: "#e8e6e0", backgroundColor: "#eceae5" },
      false,
    );

    warnOnLowContrast(vars, false);

    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0]?.[0] as string;
    expect(message).toContain("--cy-muted");
    expect(message).toContain("--cy-bg");
  });

  it("does not warn for the shipped default theme (passes AA)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    warnOnLowContrast(computeThemeVars(undefined, false), false);

    expect(warn).not.toHaveBeenCalled();
  });

  it("checks light and dark independently: a pair that only fails in dark mode warns only when isDark is true", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    // #595959 is a comfortable 7:1 pass against the light default --cy-bg
    // (#ffffff), but only 2.46:1 against the dark default --cy-bg (#161B27) —
    // an explicit textColor survives dark mode (Amendment A) while --cy-bg
    // falls back to its dark default because it wasn't set.
    const lightPassingVars = computeThemeVars({ textColor: "#595959" }, false);
    const darkFailingVars = computeThemeVars({ textColor: "#595959" }, true);

    warnOnLowContrast(lightPassingVars, false);
    expect(warn).not.toHaveBeenCalled();

    warnOnLowContrast(darkFailingVars, true);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0] as string).toContain("dark mode");
  });

  it("de-dupes: calling twice with the exact same ThemeVars/isDark warns only once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const vars = computeThemeVars(
      { textColor: "#d2d2ce", backgroundColor: "#dddbd6", mutedTextColor: "#000000" },
      false,
    );

    warnOnLowContrast(vars, false);
    warnOnLowContrast(vars, false);
    warnOnLowContrast(vars, false);

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("warns again on a new bad combination even after an identical repeat was de-duped", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const first = computeThemeVars(
      { textColor: "#c9c9c4", backgroundColor: "#d4d2cd", mutedTextColor: "#000000" },
      false,
    );
    const second = computeThemeVars(
      { textColor: "#b3b3ad", backgroundColor: "#bebcb7", mutedTextColor: "#000000" },
      false,
    );

    warnOnLowContrast(first, false);
    warnOnLowContrast(first, false); // de-duped
    warnOnLowContrast(second, false); // genuinely new — should warn

    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("a non-hex --cy-text produces zero warnings and does not throw", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const vars = computeThemeVars(
      { textColor: "rgb(33, 33, 33)", backgroundColor: "#ffffff" },
      false,
    );

    expect(() => warnOnLowContrast(vars, false)).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });

  it("--cy-on-primary and --cy-on-widget-bg are never inspected", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const vars = computeThemeVars({ textColor: "#ececec", backgroundColor: "#f1f1f1" }, false);
    // Deliberately craft unreadable-looking values on the two derived tokens —
    // they must never appear in a warning because the function never compares
    // them against anything.
    const crafted = { ...vars, "--cy-on-primary": "#ffffff", "--cy-on-widget-bg": "#ffffff" };

    warnOnLowContrast(crafted, false);

    for (const call of warn.mock.calls) {
      const message = call[0] as string;
      expect(message).not.toContain("--cy-on-primary");
      expect(message).not.toContain("--cy-on-widget-bg");
    }
  });

  it("stays silent regardless of contrast when NODE_ENV is production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const vars = computeThemeVars({ textColor: "#f0f0ec", backgroundColor: "#f5f5f0" }, false);

    warnOnLowContrast(vars, false);

    expect(warn).not.toHaveBeenCalled();
  });
});
