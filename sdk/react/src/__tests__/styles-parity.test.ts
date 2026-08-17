/// <reference types="node" />
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeThemeVars } from "../styles/tokens.js";

const sheet = readFileSync(join(process.cwd(), "src/styles/cookieyes.css"), "utf8");
const vars = computeThemeVars(undefined, false);

/**
 * The stylesheet's `:root` defaults are what make the server-rendered
 * banner paint correctly before hydration. They duplicate values that
 * `computeThemeVars` owns, so they can drift; these tests are the guard that
 * they don't. The defaults were lost entirely once before, when the sheet moved
 * out of `tokens.ts` and left every `var(--cy-*)` reference undeclared.
 */
describe("theme token defaults are declared and match tokens.ts", () => {
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
    // Only the four tokens that actually differ in dark mode are overridden —
    // re-declaring the rest would be dead weight in a render-blocking sheet.
    for (const [name, value] of Object.entries(darkVars)) {
      expect(normalise(value)).toBe(normalise(dark[name as keyof typeof dark]));
    }
    for (const name of ["--cy-bg", "--cy-text", "--cy-muted", "--cy-border"]) {
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
  });
});
