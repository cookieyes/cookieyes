import * as react from "@cookieyes/react";
import { describe, expect, it } from "vitest";
import * as nextjs from "../index.js";

/**
 * @cookieyes/nextjs is a thin barrel that re-exports the entire
 * @cookieyes/react surface (pre-marked "use client"). These smoke tests guard
 * against the barrel silently dropping or renaming an export — the most likely
 * way this package breaks for consumers.
 */
describe("@cookieyes/nextjs barrel", () => {
  const EXPECTED = [
    // Runtime builder
    "createCookieYes",
    "getCookieYes",
    "resetCookieYes",
    // Styled presets
    "CookieBanner",
    "CookiePreferences",
    "CookieOptOut",
    // Headless primitives
    "Banner",
    "Preferences",
    "OptOut",
    // Controls
    "RecallButton",
    "GatedScript",
    "GatedFrame",
    // Hooks
    "useConsent",
    "useConsentActions",
    "useConsentCategory",
    "useConsentRuntime",
    "useRegulation",
    "useTranslations",
    "useBannerVisibility",
    "usePreferencesOpen",
    "useOptOutOpen",
    // Core utilities (re-exported through react)
    "defaultTranslations",
    "resolveTranslations",
    "getOrCreateConsentRuntime",
    "resetConsentRuntime",
  ] as const;

  it.each(EXPECTED)("re-exports %s and it is defined", (name) => {
    expect(nextjs).toHaveProperty(name);
    expect(nextjs[name as keyof typeof nextjs]).toBeDefined();
  });

  it("re-exports the same reference as @cookieyes/react (no shadowing)", () => {
    for (const name of EXPECTED) {
      const key = name as keyof typeof react;
      if (key in react) {
        expect(nextjs[name as keyof typeof nextjs]).toBe(react[key]);
      }
    }
  });

  it("does not leak unexpected runtime values beyond the react surface", () => {
    // Every runtime (non-type) export of nextjs must also exist on react.
    for (const name of Object.keys(nextjs)) {
      expect(react).toHaveProperty(name);
    }
  });
});
