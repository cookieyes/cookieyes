import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookiePreferences } from "../presets/CookiePreferences.js";
import { getCookieYes, initCookieYes, resetCookieYes } from "../runtime.js";
import { clearCookie } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  resetCookieYes();
  clearCookie();
});

function openPreferences() {
  getCookieYes().manager.showPreferences();
}

describe("custom category translations", () => {
  it("translates a custom category by id, falling back to its config label", () => {
    initCookieYes({
      mode: "cookie-only",
      categories: [
        { id: "necessary", required: true },
        { id: "insights", label: "Shopping Insights" },
      ],
      i18n: { messages: { fr: { categories: { insights: { label: "Aperçus" } } } } },
    });
    act(() => openPreferences());
    render(<CookiePreferences />);

    // English: no translation for the custom id → its config label.
    expect(document.body.textContent).toContain("Shopping Insights");

    act(() => {
      void getCookieYes().setLanguage("fr");
    });

    // French: the provided translation wins.
    expect(document.body.textContent).toContain("Aperçus");
    expect(document.body.textContent).not.toContain("Shopping Insights");
  });

  it("keeps a relabeled built-in's config label when untranslated (English default doesn't mask it)", () => {
    initCookieYes({
      mode: "cookie-only",
      categories: [
        { id: "necessary", required: true },
        { id: "analytics", label: "Statistics" },
      ],
    });
    act(() => openPreferences());
    render(<CookiePreferences />);

    expect(document.body.textContent).toContain("Statistics");
    expect(document.body.textContent).not.toContain("Analytics");
  });
});
