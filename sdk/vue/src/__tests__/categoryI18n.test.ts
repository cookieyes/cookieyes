import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookiePreferences } from "../presets/CookiePreferences.js";
import { getCookieYes } from "../runtime.js";
import { clearCookie, mountWith, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

describe("custom category translations", () => {
  it("translates a custom category by id, falling back to its config label", async () => {
    mountWith(
      {
        mode: "cookie-only",
        categories: [
          { id: "necessary", required: true },
          { id: "insights", label: "Shopping Insights" },
        ],
        i18n: { messages: { fr: { categories: { insights: { label: "Aperçus" } } } } },
      },
      CookiePreferences,
    );
    getCookieYes().manager.showPreferences();
    await flushPromises();

    // English: no translation for the custom id, so its config label.
    expect(document.body.textContent).toContain("Shopping Insights");

    await getCookieYes().setLanguage("fr");
    await flushPromises();

    // French: the provided translation wins.
    expect(document.body.textContent).toContain("Aperçus");
    expect(document.body.textContent).not.toContain("Shopping Insights");
  });

  it("keeps a relabeled built-in's config label when untranslated (English default doesn't mask it)", async () => {
    mountWith(
      {
        mode: "cookie-only",
        categories: [
          { id: "necessary", required: true },
          { id: "analytics", label: "Statistics" },
        ],
      },
      CookiePreferences,
    );
    getCookieYes().manager.showPreferences();
    await flushPromises();

    expect(document.body.textContent).toContain("Statistics");
    expect(document.body.textContent).not.toContain("Analytics");
  });
});
