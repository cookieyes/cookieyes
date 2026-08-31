/// <reference types="node" />
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeThemeVars, contrastRatio } from "../styles/tokens.js";

const sheet = readFileSync(join(process.cwd(), "src/styles/cookieyes.css"), "utf8");
const vars = computeThemeVars(undefined, false);
const darkVarsComputed = computeThemeVars(undefined, true);

// Declarations are compared after normalising the things CSS treats as
// equivalent but a string compare does not: hex case (`#6B7280` vs
// `#6b7280`, since Biome lowercases CSS hex) and quote style (`'Segoe UI'`
// vs `"Segoe UI"`, since Biome prefers double quotes in CSS).
function normalise(value: string): string {
  return value.replace(/['"]/g, '"').replace(/\s+/g, " ").trim().toLowerCase();
}

/** The declarations inside a `:root { … }` rule, as a name → value map. */
function rootVars(from: string): Record<string, string> {
  const open = from.indexOf(":root {");
  if (open === -1) throw new Error("no :root rule found");
  const body = from.slice(open + ":root {".length, from.indexOf("}", open));
  const out: Record<string, string> = {};
  for (const line of body.split(";")) {
    const [name, ...rest] = line.split(":");
    if (!name || rest.length === 0) continue;
    out[name.trim()] = rest.join(":").trim();
  }
  return out;
}

const lightVars = rootVars(sheet);
const darkBlockStart = sheet.indexOf("@media (prefers-color-scheme: dark)");
const darkVars = rootVars(sheet.slice(darkBlockStart));

/**
 * Test-local re-implementation of `readableTextOn` from `styles/tokens.ts`,
 * used only to derive the *expected* value for an arbitrary hex input in
 * assertions below — the production function itself is intentionally not
 * exported (it's an internal implementation detail of `computeThemeVars`).
 */
function readableTextOnForTest(background: string): string {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(background.trim());
  if (!hex) return "#ffffff";
  const digits = hex[1];
  if (!digits) return "#ffffff";
  const full =
    digits.length === 3
      ? digits
          .split("")
          .map((c) => c + c)
          .join("")
      : digits;
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16) / 255);
  if (r === undefined || g === undefined || b === undefined) return "#ffffff";
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  const contrastWithWhite = 1.05 / (L + 0.05);
  const contrastWithBlack = (L + 0.05) / 0.05;
  return contrastWithBlack >= contrastWithWhite ? "#111111" : "#ffffff";
}

/**
 * The stylesheet's `:root` defaults are what make the server-rendered
 * banner paint correctly before hydration. They duplicate values that
 * `computeThemeVars` owns, so they can drift; these tests are the guard that
 * they don't. The defaults were lost entirely once before, when the sheet moved
 * out of `tokens.ts` and left every `var(--cy-*)` reference undeclared.
 */
describe("theme token defaults are declared and match tokens.ts", () => {
  it("declares every --cy-* token computeThemeVars produces", () => {
    for (const name of Object.keys(vars)) {
      expect(Object.keys(lightVars)).toContain(name);
    }
  });

  it("every declared light value equals computeThemeVars(undefined, false)", () => {
    for (const [name, expected] of Object.entries(vars)) {
      expect(normalise(lightVars[name] ?? "")).toBe(normalise(expected));
    }
  });

  it("the prefers-color-scheme: dark block matches computeThemeVars(undefined, true)", () => {
    const dark = computeThemeVars(undefined, true);
    // Six tokens are re-declared in the dark block: the five that actually
    // differ in dark mode (--cy-bg, --cy-text, --cy-muted, --cy-border,
    // --cy-widget-bg — each only when the developer didn't set that value
    // explicitly, see tokens.ts's DARK_DEFAULTABLE) plus --cy-on-widget-bg,
    // which is redeclared because it's derived from --cy-widget-bg and must
    // be recomputed against this scheme's background.
    for (const [name, value] of Object.entries(darkVars)) {
      expect(normalise(value)).toBe(normalise(dark[name as keyof typeof dark]));
    }
    for (const name of ["--cy-bg", "--cy-text", "--cy-muted", "--cy-border", "--cy-widget-bg"]) {
      expect(Object.keys(darkVars)).toContain(name);
    }
  });

  it("no var(--cy-*) reference in the sheet lacks a declaration", () => {
    // The exact failure mode of the July regression: references kept, values gone.
    const referenced = new Set(
      [...sheet.matchAll(/var\((--cy-[a-z-]+)/g)].map((m) => m[1] as string),
    );
    for (const name of referenced) {
      expect(Object.keys(lightVars)).toContain(name);
    }
  });
});

describe("styles-parity", () => {
  describe("D1: floating revisit widget background token", () => {
    it("D1: computeThemeVars includes --cy-widget-bg defaulting to #0056a7", () => {
      expect(vars["--cy-widget-bg"]).toBe("#0056a7");
    });

    it("D1: .cy-widget background references var(--cy-widget-bg)", () => {
      // The .cy-widget rule must use the token, not var(--cy-primary)
      const widgetRuleStart = sheet.indexOf(".cy-widget {");
      const widgetRuleEnd = sheet.indexOf("}", widgetRuleStart);
      const widgetRule = sheet.slice(widgetRuleStart, widgetRuleEnd);
      expect(widgetRule).toContain("background: var(--cy-widget-bg)");
    });
  });

  describe("D2: CCPA Cancel button", () => {
    it("D2: .cy-btn-cancel background is transparent", () => {
      const start = sheet.indexOf(".cy-btn-cancel {");
      const end = sheet.indexOf("}", start);
      const rule = sheet.slice(start, end);
      expect(rule).toContain("background: transparent");
    });

    it("D2: .cy-btn-cancel color is #858585", () => {
      const start = sheet.indexOf(".cy-btn-cancel {");
      const end = sheet.indexOf("}", start);
      const rule = sheet.slice(start, end);
      expect(rule).toContain("color: #858585");
    });

    it("D2: .cy-btn-cancel border is 1px solid #dedfe0", () => {
      const start = sheet.indexOf(".cy-btn-cancel {");
      const end = sheet.indexOf("}", start);
      const rule = sheet.slice(start, end);
      expect(rule).toContain("border: 1px solid #dedfe0");
    });
  });

  describe("D3: CCPA Opt-out checkbox", () => {
    it("D3: .cy-optout-checkbox height is 18.5px", () => {
      // Find the base rule (not inside a media query)
      // The base .cy-optout-checkbox rule ends before :checked
      const baseStart = sheet.indexOf(".cy-optout-checkbox {");
      const baseEnd = sheet.indexOf("}", baseStart);
      const baseRule = sheet.slice(baseStart, baseEnd);
      expect(baseRule).toContain("height: 18.5px");
    });

    it("D3: .cy-optout-checkbox:checked::after uses bottom: 4px (not top: 2px)", () => {
      const start = sheet.indexOf(".cy-optout-checkbox:checked::after {");
      const end = sheet.indexOf("}", start);
      const rule = sheet.slice(start, end);
      expect(rule).toContain("bottom: 4px");
      expect(rule).not.toContain("top: 2px");
    });

    it("D3: .cy-optout-checkbox:checked::after has width 7px, height 13px, border-width 0 3px 3px 0, border-radius 2px", () => {
      const start = sheet.indexOf(".cy-optout-checkbox:checked::after {");
      const end = sheet.indexOf("}", start);
      const rule = sheet.slice(start, end);
      expect(rule).toContain("width: 7px");
      expect(rule).toContain("height: 13px");
      expect(rule).toContain("border-width: 0 3px 3px 0");
      expect(rule).toContain("border-radius: 2px");
    });
  });

  describe("D4: Banner description scrollable at <=440px", () => {
    it("D4: @media (max-width: 440px) adds max-height: 40vh overflow-y: auto to .cy-banner-description", () => {
      const mediaStart = sheet.indexOf("@media (max-width: 440px)");
      expect(sheet).toContain("max-height: 40vh");
      expect(sheet).toContain("overflow-y: auto");
      // And that it appears after the 440px media query opener
      const fortyVhPos = sheet.indexOf("max-height: 40vh");
      expect(fortyVhPos).toBeGreaterThan(mediaStart);
    });
  });

  describe("D5: Tiny screen <=352px typography ramp", () => {
    it("D5: sheet contains @media (max-width: 352px) block", () => {
      expect(sheet).toContain("@media (max-width: 352px)");
    });

    it("D5: .cy-banner-title font-size is 16px inside <=352px block", () => {
      const mediaStart = sheet.indexOf("@media (max-width: 352px)");
      expect(mediaStart).toBeGreaterThan(-1);
      const blockSnippet = sheet.slice(mediaStart, mediaStart + 1200);
      expect(blockSnippet).toContain(".cy-banner-title");
      expect(blockSnippet).toContain("font-size: 16px");
    });

    it("D5: inside <=352px block, .cy-accordion-btn is 14px and .cy-banner-description is 12px", () => {
      const mediaStart = sheet.indexOf("@media (max-width: 352px)");
      const blockSnippet = sheet.slice(mediaStart, mediaStart + 1200);
      expect(blockSnippet).toContain(".cy-accordion-btn");
      // font-size 14px appears for .cy-accordion-btn
      const btnPos = blockSnippet.indexOf(".cy-accordion-btn");
      const btnRule = blockSnippet.slice(btnPos, blockSnippet.indexOf("}", btnPos));
      expect(btnRule).toContain("font-size: 14px");
      // font-size 12px appears for .cy-banner-description
      expect(blockSnippet).toContain("font-size: 12px");
    });
  });

  describe("D6: Mid screen <=425px adjustments", () => {
    it("D6: sheet contains @media (max-width: 425px) block", () => {
      expect(sheet).toContain("@media (max-width: 425px)");
    });

    it("D6: toggle is 38px x 21px with 17px thumb inside <=425px block", () => {
      const mediaStart = sheet.indexOf("@media (max-width: 425px)");
      const blockSnippet = sheet.slice(mediaStart, mediaStart + 600);
      expect(blockSnippet).toContain("width: 38px");
      expect(blockSnippet).toContain("height: 21px");
      expect(blockSnippet).toContain("width: 17px");
      expect(blockSnippet).toContain("height: 17px");
      expect(blockSnippet).toContain("translateX(17px)");
    });
  });

  describe("D7: Height-based media queries", () => {
    it("D7: sheet contains @media (max-height: 480px) with .cy-banner overflow-y: auto", () => {
      const mediaStart = sheet.indexOf("@media (max-height: 480px)");
      expect(mediaStart).toBeGreaterThan(-1);
      const blockSnippet = sheet.slice(mediaStart, mediaStart + 300);
      expect(blockSnippet).toContain(".cy-banner");
      expect(blockSnippet).toContain("overflow-y: auto");
      expect(blockSnippet).toContain("max-height: 100vh");
    });

    it("D7: sheet contains @media (min-width: 576px) and (max-height: 660px)", () => {
      expect(sheet).toContain("@media (min-width: 576px) and (max-height: 660px)");
    });

    it("D7: sheet contains @media (max-height: 576px) with .cy-dialog height: 100vh", () => {
      const mediaStart = sheet.indexOf("@media (max-height: 576px)");
      expect(mediaStart).toBeGreaterThan(-1);
      const blockSnippet = sheet.slice(mediaStart, mediaStart + 300);
      expect(blockSnippet).toContain(".cy-dialog");
      expect(blockSnippet).toContain("height: 100vh");
    });
  });

  describe("D8: Description images minimum dimensions", () => {
    it("D8: .cy-banner-description img, .cy-dialog-desc img, .cy-accordion-header-des img have min 25px dimensions", () => {
      expect(sheet).toContain(".cy-banner-description img");
      expect(sheet).toContain(".cy-dialog-desc img");
      expect(sheet).toContain(".cy-accordion-header-des img");
      // Find the combined selector rule
      const imgRuleStart = sheet.indexOf(".cy-banner-description img");
      const imgRuleEnd = sheet.indexOf("}", imgRuleStart);
      const imgRule = sheet.slice(imgRuleStart, imgRuleEnd);
      expect(imgRule).toContain("min-height: 25px");
      expect(imgRule).toContain("min-width: 25px");
    });
  });

  describe("D9: Focus-ring token (--cy-focus)", () => {
    it("D9: --cy-focus defaults to var(--cy-primary)", () => {
      expect(computeThemeVars(undefined, false)["--cy-focus"]).toBe("var(--cy-primary)");
    });

    it("D9: no hardcoded outline references var(--cy-primary) anymore", () => {
      expect(sheet.match(/outline: 2px solid var\(--cy-primary\)/g)).toBeNull();
      expect(sheet.match(/outline: 3px solid var\(--cy-primary\)/g)).toBeNull();
    });

    it("D9: exactly 8 outline declarations reference var(--cy-focus) (7x 2px, 1x 3px)", () => {
      const matches = sheet.match(/outline: \dpx solid var\(--cy-focus\)/g) ?? [];
      expect(matches).toHaveLength(8);
      const twoPx = matches.filter((m) => m.startsWith("outline: 2px"));
      const threePx = matches.filter((m) => m.startsWith("outline: 3px"));
      expect(twoPx).toHaveLength(7);
      expect(threePx).toHaveLength(1);
    });
  });

  describe("D10: Auto-contrast text token (--cy-on-primary)", () => {
    it("D10: --cy-on-primary defaults to #ffffff for the SDK's default primary", () => {
      expect(computeThemeVars(undefined, false)["--cy-on-primary"]).toBe("#ffffff");
    });

    it("D10: picks near-black for a light primary", () => {
      expect(computeThemeVars({ primaryColor: "#ffe680" }, false)["--cy-on-primary"]).toBe(
        "#111111",
      );
    });

    it("D10: falls back to white for any non-hex primaryColor value", () => {
      expect(computeThemeVars({ primaryColor: "rebeccapurple" }, false)["--cy-on-primary"]).toBe(
        "#ffffff",
      );
      expect(computeThemeVars({ primaryColor: "rgb(20, 30, 40)" }, false)["--cy-on-primary"]).toBe(
        "#ffffff",
      );
    });

    it("D10: .cy-btn-primary and .cy-btn-confirm reference --cy-on-primary, not a hardcoded #fff", () => {
      const primaryStart = sheet.indexOf(".cy-btn-primary {");
      const primaryEnd = sheet.indexOf("}", primaryStart);
      const primaryRule = sheet.slice(primaryStart, primaryEnd);
      expect(primaryRule).toContain("color: var(--cy-on-primary)");

      const confirmStart = sheet.indexOf(".cy-btn-confirm {");
      const confirmEnd = sheet.indexOf("}", confirmStart);
      const confirmRule = sheet.slice(confirmStart, confirmEnd);
      expect(confirmRule).toContain("color: var(--cy-on-primary)");
    });
  });

  describe("D11: Configurable, dark-aware widget background", () => {
    it("D11: --cy-widget-bg is theme-configurable", () => {
      expect(computeThemeVars({ widgetBackgroundColor: "#123456" }, false)["--cy-widget-bg"]).toBe(
        "#123456",
      );
    });

    it("D11: --cy-widget-bg has a dark counterpart, distinct from the light default", () => {
      expect(darkVarsComputed["--cy-widget-bg"]).toBeDefined();
      expect(darkVarsComputed["--cy-widget-bg"]).not.toBe(vars["--cy-widget-bg"]);
    });
  });

  describe("D12: general 'every color token has a dark counterpart' guard", () => {
    const CARRY_THROUGH = new Set([
      "--cy-primary",
      "--cy-primary-hover",
      "--cy-focus",
      "--cy-on-primary",
    ]);
    const NON_COLOR = new Set(["--cy-radius", "--cy-font"]);

    it("every color token not in the carry-through set has a declared dark override", () => {
      for (const name of Object.keys(vars)) {
        if (CARRY_THROUGH.has(name) || NON_COLOR.has(name)) continue;
        expect(Object.keys(darkVars)).toContain(name);
      }
    });
  });

  describe("REGRESSION: pre-existing landmark rules", () => {
    it("REGRESSION: key pre-existing rules are still present after parity changes", () => {
      expect(sheet).toContain(".cy-banner-wrap");
      expect(sheet).toContain(".cy-banner {");
      expect(sheet).toContain(".cy-btn-primary");
      expect(sheet).toContain(".cy-btn-outline");
      expect(sheet).toContain(".cy-dialog {");
      expect(sheet).toContain(".cy-toggle {");
      expect(sheet).toContain(".cy-branding");
      expect(sheet).toContain("@media (max-width: 576px)");
      expect(sheet).toContain("@media (max-width: 845px)");
    });

    it("REGRESSION: computeThemeVars still provides --cy-primary", () => {
      expect(vars["--cy-primary"]).toBe("#1863dc");
    });
  });

  describe("theme value sanitization (CSS injection guard)", () => {
    it("strips `;` `{` `}` so a hostile theme value cannot break out of its declaration", () => {
      const out = computeThemeVars({ primaryColor: "red; } body { display: none; .x{" }, false);
      expect(out["--cy-primary"]).not.toMatch(/[;{}]/);
    });

    it("strips CSS comment delimiters", () => {
      const out = computeThemeVars({ textColor: "blue /* comment */ green" }, false);
      expect(out["--cy-text"]).not.toContain("/*");
      expect(out["--cy-text"]).not.toContain("*/");
    });

    it("strips backslash, angle brackets, and embedded newlines from the value", () => {
      const out = computeThemeVars({ fontFamily: "Arial\\\n<script>" }, false);
      expect(out["--cy-font"]).not.toContain("\\");
      expect(out["--cy-font"]).not.toContain("<");
      expect(out["--cy-font"]).not.toContain(">");
      expect(out["--cy-font"]).not.toMatch(/[\r\n]/);
    });

    it("falls back to the default when sanitization empties the value", () => {
      const out = computeThemeVars({ primaryColor: ";;}}{{" }, false);
      expect(out["--cy-primary"]).toBe("#1863dc");
    });

    it("falls back to the default for non-string input", () => {
      const out = computeThemeVars({ primaryColor: 123 as unknown as string }, false);
      expect(out["--cy-primary"]).toBe("#1863dc");
    });

    it("caps value length at 200 chars", () => {
      const long = "a".repeat(500);
      const out = computeThemeVars({ fontFamily: long }, false);
      expect(out["--cy-font"].length).toBeLessThanOrEqual(200);
    });

    it("passes through legitimate values untouched", () => {
      const out = computeThemeVars(
        {
          primaryColor: "#ff8800",
          backgroundColor: "rgb(20, 30, 40)",
          fontFamily: "'Inter', sans-serif",
          borderRadius: "8px",
        },
        false,
      );
      expect(out["--cy-primary"]).toBe("#ff8800");
      expect(out["--cy-bg"]).toBe("rgb(20, 30, 40)");
      expect(out["--cy-font"]).toBe("'Inter', sans-serif");
      expect(out["--cy-radius"]).toBe("8px");
    });

    it("applies dark overrides only when isDark is true", () => {
      const light = computeThemeVars(undefined, false);
      const dark = computeThemeVars(undefined, true);
      expect(light["--cy-bg"]).toBe("#ffffff");
      expect(dark["--cy-bg"]).toBe("#161B27");
    });

    it("sanitizes a hostile focusColor value (no ; { } surviving)", () => {
      const out = computeThemeVars({ focusColor: "red; } body { display: none" }, false);
      expect(out["--cy-focus"]).not.toMatch(/[;{}]/);
    });

    it("falls back to #0056a7 when widgetBackgroundColor sanitizes to empty", () => {
      const out = computeThemeVars({ widgetBackgroundColor: ";;}}{{ " }, false);
      expect(out["--cy-widget-bg"]).toBe("#0056a7");
    });
  });

  describe("Amendment A: explicit theme values survive dark mode", () => {
    it("A1: an explicit backgroundColor survives dark mode, not overwritten by the dark default", () => {
      expect(computeThemeVars({ backgroundColor: "#FAFAFA" }, true)["--cy-bg"]).toBe("#FAFAFA");
    });

    it("A2: the dark default for --cy-bg still applies when nothing was set", () => {
      expect(computeThemeVars(undefined, true)["--cy-bg"]).toBe("#161B27");
    });

    it("A3: same pair for --cy-widget-bg via widgetBackgroundColor", () => {
      expect(computeThemeVars({ widgetBackgroundColor: "#654321" }, true)["--cy-widget-bg"]).toBe(
        "#654321",
      );
      expect(computeThemeVars(undefined, true)["--cy-widget-bg"]).toBe("#1F6FD1");
    });

    it("A4: a whitespace-only / non-string backgroundColor is treated as not provided, so the dark default still applies", () => {
      expect(computeThemeVars({ backgroundColor: "   " }, true)["--cy-bg"]).toBe("#161B27");
      expect(computeThemeVars({ backgroundColor: 123 as unknown as string }, true)["--cy-bg"]).toBe(
        "#161B27",
      );
    });

    it("A5: every dark-overridden token's explicit config survives dark mode (every DARK_OVERRIDES key has a suppressing field)", () => {
      const explicit = computeThemeVars(
        {
          backgroundColor: "#111111",
          textColor: "#222222",
          mutedTextColor: "#333333",
          borderColor: "#444444",
          widgetBackgroundColor: "#555555",
        },
        true,
      );
      expect(explicit["--cy-bg"]).toBe("#111111");
      expect(explicit["--cy-text"]).toBe("#222222");
      expect(explicit["--cy-muted"]).toBe("#333333");
      expect(explicit["--cy-border"]).toBe("#444444");
      expect(explicit["--cy-widget-bg"]).toBe("#555555");
    });
  });

  describe("Amendment B: --cy-on-widget-bg auto-contrast for the floating widget", () => {
    it("B6: .cy-widget references var(--cy-on-widget-bg) and has no hardcoded #fff color", () => {
      const start = sheet.indexOf(".cy-widget {");
      const end = sheet.indexOf("}", start);
      const rule = sheet.slice(start, end);
      expect(rule).toContain("color: var(--cy-on-widget-bg)");
      expect(rule).not.toContain("color: #fff");
    });

    it("B7: a light widget background yields a dark icon", () => {
      expect(
        computeThemeVars({ widgetBackgroundColor: "#FFEB3B" }, false)["--cy-on-widget-bg"],
      ).toBe("#111111");
    });

    it("B8: --cy-on-widget-bg is derived from the resolved (post-dark-default) widget background", () => {
      const dark = computeThemeVars(undefined, true);
      expect(dark["--cy-on-widget-bg"]).toBe(readableTextOnForTest(dark["--cy-widget-bg"]));
      // The dark widget background itself is the dark default, not the light one.
      expect(dark["--cy-widget-bg"]).toBe("#1F6FD1");
    });

    it("B8b: an explicit dark-surviving widgetBackgroundColor drives --cy-on-widget-bg too", () => {
      const dark = computeThemeVars({ widgetBackgroundColor: "#FFEB3B" }, true);
      expect(dark["--cy-widget-bg"]).toBe("#FFEB3B");
      expect(dark["--cy-on-widget-bg"]).toBe("#111111");
    });

    it("B9: readableTextOn falls back to white for every non-hex input", () => {
      for (const value of [
        "rgb(0, 0, 0)",
        "hsl(0, 0%, 0%)",
        "red",
        "var(--x)",
        "color-mix(in srgb, red, blue)",
      ]) {
        expect(computeThemeVars({ widgetBackgroundColor: value }, false)["--cy-on-widget-bg"]).toBe(
          "#ffffff",
        );
      }
    });
  });
});

describe("DEVP-76: --cy-primary-hover is wired up (dead-token fix)", () => {
  it(".cy-btn-primary:hover exists after .cy-btn:hover and sets opacity, background, and border-color from --cy-primary-hover", () => {
    const btnHoverPos = sheet.indexOf(".cy-btn:hover {");
    const primaryHoverPos = sheet.indexOf(".cy-btn-primary:hover {");
    expect(btnHoverPos).toBeGreaterThan(-1);
    expect(primaryHoverPos).toBeGreaterThan(-1);
    // Both rules are specificity (0,2,0) — source order decides the winner,
    // so .cy-btn-primary:hover must come after .cy-btn:hover.
    expect(primaryHoverPos).toBeGreaterThan(btnHoverPos);

    const end = sheet.indexOf("}", primaryHoverPos);
    const rule = sheet.slice(primaryHoverPos, end);
    expect(rule).toContain("opacity: 1");
    expect(rule).toContain("background: var(--cy-primary-hover)");
    expect(rule).toContain("border-color: var(--cy-primary-hover)");
  });

  it(".cy-btn-confirm:hover matches the primary treatment, so both primary-styled buttons agree", () => {
    // .cy-btn-confirm (the CCPA opt-out Save button) uses the same --cy-primary
    // background and --cy-on-primary text as .cy-btn-primary, so it gets the same
    // hover treatment. Without this the two primary actions diverge on hover, and
    // --cy-primary-hover would apply to one primary-styled button but not the other.
    const btnHoverPos = sheet.indexOf(".cy-btn:hover {");
    const confirmHoverPos = sheet.indexOf(".cy-btn-confirm:hover {");
    expect(confirmHoverPos).toBeGreaterThan(-1);
    expect(confirmHoverPos).toBeGreaterThan(btnHoverPos);

    const end = sheet.indexOf("}", confirmHoverPos);
    const rule = sheet.slice(confirmHoverPos, end);
    expect(rule).toContain("opacity: 1");
    expect(rule).toContain("background: var(--cy-primary-hover)");
    expect(rule).toContain("border-color: var(--cy-primary-hover)");
  });

  it("--cy-primary-hover appears inside a var() reference in a non-:root declaration block", () => {
    // The literal regression guard for the bug this ticket fixes: the token
    // was computed and declared but consumed by zero CSS rules.
    const withoutRoot = sheet.replace(/:root\s*\{[^}]*\}/g, "");
    expect(withoutRoot).toContain("var(--cy-primary-hover)");
  });

  it("dead-token guard: every ThemeVars token is consumed by a var() reference outside :root", () => {
    // Regression guard for the exact bug this ticket found — fails if a future
    // token is ever added to ThemeVars and never actually consumed by a rule.
    // :root declarations (including the dark-scheme override) reference tokens
    // too (aliases, e.g. --cy-focus: var(--cy-primary)), so they're excluded
    // here or the guard would pass vacuously.
    const withoutRoot = sheet.replace(/:root\s*\{[^}]*\}/g, "");
    for (const name of Object.keys(vars)) {
      expect(withoutRoot, `${name} has no consumer outside :root`).toContain(`var(${name})`);
    }
  });
});

describe("DEVP-76: contrastRatio (extracted from readableTextOn)", () => {
  it("returns 21 for black on white (maximum contrast)", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("returns 1 for a colour against itself (no contrast)", () => {
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#123456", "#123456")).toBeCloseTo(1, 5);
  });

  it("is symmetric — argument order does not matter", () => {
    expect(contrastRatio("#1863dc", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#1863dc") as number,
      10,
    );
  });

  it("expands 3-digit hex the same way as 6-digit hex", () => {
    expect(contrastRatio("#fff", "#000")).toBeCloseTo(
      contrastRatio("#ffffff", "#000000") as number,
      10,
    );
  });

  it("returns null when either input is not 3- or 6-digit hex", () => {
    expect(contrastRatio("rgb(0,0,0)", "#ffffff")).toBeNull();
    expect(contrastRatio("#ffffff", "hsl(0, 0%, 0%)")).toBeNull();
    expect(contrastRatio("red", "blue")).toBeNull();
    expect(contrastRatio("var(--cy-primary)", "#ffffff")).toBeNull();
  });

  it("readableTextOn (via computeThemeVars) is unchanged by the refactor — matches the independent test re-implementation", () => {
    for (const primary of ["#1863dc", "#ffe680", "#000000", "#ffffff", "#7c3aed", "#fff"]) {
      expect(computeThemeVars({ primaryColor: primary }, false)["--cy-on-primary"]).toBe(
        readableTextOnForTest(primary),
      );
    }
  });
});
