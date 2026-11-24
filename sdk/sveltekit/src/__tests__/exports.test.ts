// @vitest-environment node
import * as svelte from "@cookieyes/svelte";
import { describe, expect, it } from "vitest";
import * as sveltekit from "../index.js";
import * as stylesRoute from "../styles-route.js";
import { GET } from "../styles-route.js";

/**
 * Pins the public surface of @cookieyes/sveltekit. Adding or removing a name is an API change:
 * update this list, the docs and the changeset together.
 */
const OWN = [
  "cookieyesHandle",
  "loadConsent",
  "CookieYesRoot",
  "CRITICAL_CSS",
  "CRITICAL_CSS_HASH",
  "DEFAULT_STYLES_HREF",
] as const;

/**
 * What a consumer who installed only this package needs from @cookieyes/svelte: under pnpm's
 * strict layout they cannot import it themselves.
 */
const FROM_SVELTE = [
  "registerNetworkBlocker",
  "blockIframes",
  "registerStopHandler",
  "getCookieYes",
  "CookieBanner",
  "CookiePreferences",
  "CookieOptOut",
  "ReloadNotice",
  "RecallButton",
  "GatedScript",
  "GatedFrame",
  "Banner",
  "Preferences",
  "OptOut",
  "BannerRoot",
  "BannerTitle",
  "BannerDescription",
  "BannerActions",
  "BannerBranding",
  "BannerClose",
  "BannerOpenPreferences",
  "BannerRejectAll",
  "BannerAcceptAll",
  "BannerDoNotSell",
  "PreferencesRoot",
  "PreferencesTitle",
  "PreferencesIntro",
  "PreferencesDescription",
  "PreferencesCategories",
  "PreferencesCategory",
  "PreferencesBranding",
  "PreferencesClose",
  "PreferencesRejectAll",
  "PreferencesAcceptAll",
  "PreferencesSave",
  "OptOutRoot",
  "OptOutTitle",
  "OptOutDescription",
  "OptOutCheckbox",
  "OptOutCheckboxLabel",
  "OptOutButtons",
  "OptOutSave",
  "OptOutCancel",
  "OptOutSuccess",
  "OptOutBranding",
  "OptOutClose",
  "useConsent",
  "useConsentActions",
  "useConsentCategory",
  "useConsentRuntime",
  "useRegulation",
  "useRegion",
  "useCategories",
  "useTranslations",
  "useLanguage",
  "useReloadNotice",
  "useOnConsentChange",
  "useBannerVisibility",
  "usePreferencesOpen",
  "useOptOutOpen",
  "CY_PART",
  "CY_STATE",
] as const;

/**
 * Names @cookieyes/svelte exports that this package leaves out. The provider is wrapped by
 * `<CookieYesRoot>`, and a second one would start a second runtime. The rest are server-side or
 * utility functions that @cookieyes/nextjs and @cookieyes/nuxt do not re-export either.
 */
const LEFT_OUT = [
  "CookieYesProvider",
  "_tryGetCookieYes",
  "resetCookieYes",
  "readServerConsent",
  "regionFromHeaders",
  "readGpc",
  "resolveBuiltInIntegration",
  "resolveCategories",
  "resolveRegion",
  "resolveTranslations",
  "DEFAULT_CATEGORIES",
  "defaultTranslations",
  "getTextDirection",
  "mergeTranslations",
] as const;

describe("@cookieyes/sveltekit public exports", () => {
  it.each([...OWN, ...FROM_SVELTE])("exports %s", (name) => {
    expect(sveltekit).toHaveProperty(name);
  });

  it("exports exactly the documented names and nothing else", () => {
    expect(Object.keys(sveltekit).sort()).toEqual([...OWN, ...FROM_SVELTE].sort());
  });

  it("re-exports the same objects @cookieyes/svelte does, so there is one runtime", () => {
    for (const name of FROM_SVELTE) {
      expect(Reflect.get(sveltekit, name)).toBe(Reflect.get(svelte, name));
    }
  });

  it("accounts for every @cookieyes/svelte export: re-exported or deliberately left out", () => {
    const covered = new Set<string>([...FROM_SVELTE, ...LEFT_OUT]);
    expect(Object.keys(svelte).filter((name) => !covered.has(name))).toEqual([]);
  });

  it("does not export the provider, the root wraps it", () => {
    expect(sveltekit).not.toHaveProperty("CookieYesProvider");
  });

  it("defaults the stylesheet path to the one @cookieyes/nextjs uses", () => {
    expect(sveltekit.DEFAULT_STYLES_HREF).toBe("/cookieyes/styles.css");
  });
});

describe("@cookieyes/sveltekit/styles-route", () => {
  it("exports only GET", () => {
    expect(Object.keys(stylesRoute)).toEqual(["GET"]);
    expect(typeof GET).toBe("function");
  });
});
