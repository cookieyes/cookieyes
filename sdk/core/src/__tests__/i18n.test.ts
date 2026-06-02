import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultTranslations, resolveTranslations } from "../i18n.js";
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
    expect(resolveTranslations({ messages: { fr }, locale: "fr" })).toBe(fr);
  });

  it("matches on the primary subtag when the full tag is absent", () => {
    const fr = { ...en, acceptAll: "Tout accepter" };
    expect(resolveTranslations({ messages: { fr }, locale: "fr-CA" })).toBe(fr);
  });

  it("detects the browser language when enabled", () => {
    vi.stubGlobal("navigator", { language: "de-DE" });
    const de = { ...en, acceptAll: "Alle akzeptieren" };
    expect(resolveTranslations({ messages: { de } })).toBe(de);
  });

  it("ignores the browser language when detection is disabled", () => {
    vi.stubGlobal("navigator", { language: "de-DE" });
    const de = { ...en, acceptAll: "Alle akzeptieren" };
    // No locale + detection off → falls back to messages.en (here, bundled en)
    expect(resolveTranslations({ messages: { de }, detectBrowserLanguage: false })).toBe(en);
  });

  it("prefers a provided messages.en over the bundled catalog", () => {
    const customEn = { ...en, acceptAll: "Accept everything" };
    vi.stubGlobal("navigator", { language: "" });
    expect(resolveTranslations({ messages: { en: customEn } })).toBe(customEn);
  });
});
