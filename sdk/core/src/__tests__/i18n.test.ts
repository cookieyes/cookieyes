import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defaultTranslations,
  getTextDirection,
  mergeTranslations,
  pickLanguage,
  resolveTranslations,
} from "../i18n.js";
import { en } from "../translations/en.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveTranslations", () => {
  it("exposes the English catalog as defaultTranslations", () => {
    expect(defaultTranslations).toBe(en);
  });

  it("falls back to bundled English when no config and no navigator match", () => {
    vi.stubGlobal("navigator", { language: "" });
    expect(resolveTranslations()).toBe(en);
  });

  it("returns an exact locale match from messages", () => {
    const fr = { ...en, acceptAll: "Tout accepter" };
    // Merged over English, so value-equal (not the same reference).
    expect(resolveTranslations({ messages: { fr }, locale: "fr" })).toEqual(fr);
  });

  it("matches on the primary subtag when the full tag is absent", () => {
    const fr = { ...en, acceptAll: "Tout accepter" };
    expect(resolveTranslations({ messages: { fr }, locale: "fr-CA" })).toEqual(fr);
  });

  it("detects the browser language when enabled", () => {
    vi.stubGlobal("navigator", { language: "de-DE" });
    const de = { ...en, acceptAll: "Alle akzeptieren" };
    expect(resolveTranslations({ messages: { de } })).toEqual(de);
  });

  it("ignores the browser language when detection is disabled", () => {
    vi.stubGlobal("navigator", { language: "de-DE" });
    const de = { ...en, acceptAll: "Alle akzeptieren" };
    // No locale + detection off → English.
    expect(resolveTranslations({ messages: { de }, detectBrowserLanguage: false })).toEqual(en);
  });

  it("fills gaps from English when a language is only partially provided", () => {
    const partial = { acceptAll: "Tout accepter" };
    const result = resolveTranslations({ messages: { fr: partial }, locale: "fr" });
    expect(result.acceptAll).toBe("Tout accepter"); // overridden
    expect(result.rejectAll).toBe(en.rejectAll); // filled from English
  });
});

describe("mergeTranslations", () => {
  it("returns the base unchanged when there's no override", () => {
    expect(mergeTranslations(en)).toBe(en);
  });

  it("overrides leaf strings and keeps the rest", () => {
    const out = mergeTranslations(en, { acceptAll: "Yes" });
    expect(out.acceptAll).toBe("Yes");
    expect(out.rejectAll).toBe(en.rejectAll);
  });

  it("merges nested objects without dropping siblings", () => {
    const out = mergeTranslations(en, {
      categories: { analytics: { label: "Stats" } },
    });
    expect(out.categories.analytics.label).toBe("Stats");
    expect(out.categories.analytics.description).toBe(en.categories.analytics.description);
    expect(out.categories.necessary.label).toBe(en.categories.necessary.label);
  });
});

describe("getTextDirection", () => {
  it("is rtl for right-to-left languages, including subtagged ones", () => {
    expect(getTextDirection("ar")).toBe("rtl");
    expect(getTextDirection("ar-EG")).toBe("rtl");
    expect(getTextDirection("he")).toBe("rtl");
  });

  it("is ltr for everything else", () => {
    expect(getTextDirection("en")).toBe("ltr");
    expect(getTextDirection("fr-CA")).toBe("ltr");
  });
});

describe("pickLanguage", () => {
  it("prefers an explicit locale that we have text for", () => {
    expect(pickLanguage({ messages: { fr: en }, locale: "fr" })).toBe("fr");
  });

  it("matches the primary subtag", () => {
    expect(pickLanguage({ messages: { fr: en }, locale: "fr-CA" })).toBe("fr");
  });

  it("uses the browser language when no locale is set", () => {
    vi.stubGlobal("navigator", { language: "de-DE" });
    expect(pickLanguage({ messages: { de: en } })).toBe("de");
  });

  it("falls back to English when nothing matches", () => {
    vi.stubGlobal("navigator", { language: "" });
    expect(pickLanguage({ messages: { fr: en } })).toBe("en");
  });
});
