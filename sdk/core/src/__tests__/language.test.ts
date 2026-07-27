import { afterEach, describe, expect, it, vi } from "vitest";
import { getOrCreateConsentRuntime, resetConsentRuntime } from "../runtime.js";
import type { PartialTranslations } from "../types.js";

const fr: PartialTranslations = {
  acceptAll: "Tout accepter",
  categories: { analytics: { label: "Analytique" } },
};

function mount(messages: Record<string, PartialTranslations>) {
  return getOrCreateConsentRuntime({
    mode: "cookie-only",
    i18n: { messages, detectBrowserLanguage: false }, // deterministic: start on English
  }).consentStore;
}

afterEach(() => {
  resetConsentRuntime();
  vi.unstubAllGlobals();
});

describe("consentStore — framework-less language switching", () => {
  it("exposes the active language and switches it live, English filling gaps", async () => {
    const store = mount({ fr });

    expect(store.getLanguageInfo().language).toBe("en");
    expect(store.translations.acceptAll).toBe("Accept All");

    await store.setLanguage("fr");

    expect(store.getLanguageInfo().language).toBe("fr");
    expect(store.translations.acceptAll).toBe("Tout accepter"); // switched
    expect(store.translations.rejectAll).toBe("Reject All"); // not in fr → English
  });

  it("notifies subscribers on a language switch, so a custom UI can re-render", async () => {
    const store = mount({ fr });
    const fn = vi.fn();
    store.subscribe(fn);

    await store.setLanguage("fr");

    expect(fn).toHaveBeenCalled();
  });

  it("reports reading direction and custom category text", async () => {
    const ar: PartialTranslations = { categories: { analytics: { label: "تحليلات" } } };
    const store = mount({ ar });

    await store.setLanguage("ar");

    expect(store.getLanguageInfo().direction).toBe("rtl");
    expect(store.getCategoryText("analytics")?.label).toBe("تحليلات");
  });
});
