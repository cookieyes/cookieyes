import { describe, expect, it } from "vitest";
import * as vue from "../index.js";

/**
 * Pins the public surface of @cookieyes/vue. Adding or removing a name is an API change: update
 * this list, the docs and the changeset together.
 */
describe("@cookieyes/vue public exports", () => {
  const EXPECTED = [
    // Re-exported from @cookieyes/core/network-blocker on purpose, and load bearing: the
    // `networkBlocker` config key lives on this package's config type, so the function that
    // activates it has to be reachable from this package. A consumer who installed only
    // @cookieyes/vue cannot resolve @cookieyes/core at all under pnpm's strict layout.
    "registerNetworkBlocker",
    "blockIframes",
    "CookieYes",
    "CookieYesProvider",
    "readServerConsent",
    "getCookieYes",
    "resetCookieYes",
    "_tryGetCookieYes",
    "CookieBanner",
    "CookiePreferences",
    "CookieOptOut",
    "ReloadNotice",
    "Banner",
    "Preferences",
    "OptOut",
    "RecallButton",
    "GatedScript",
    "GatedFrame",
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
    "DEFAULT_CATEGORIES",
    "defaultTranslations",
    "getTextDirection",
    "mergeTranslations",
    "readGpc",
    "regionFromHeaders",
    "registerStopHandler",
    "resolveBuiltInIntegration",
    "resolveCategories",
    "resolveRegion",
    "resolveTranslations",
  ] as const;

  it.each(EXPECTED)("exports %s", (name) => {
    expect(vue).toHaveProperty(name);
  });

  it("exports exactly the documented names and nothing else", () => {
    expect(Object.keys(vue).sort()).toEqual([...EXPECTED].sort());
  });

  it("exposes the namespaced primitive parts", () => {
    expect(vue.Banner.Root).toBeDefined();
    expect(vue.Banner.AcceptAll).toBeDefined();
    expect(vue.Preferences.Category).toBeDefined();
    expect(vue.OptOut.Save).toBeDefined();
  });

  it("exposes every part React's namespaces expose", () => {
    expect(Object.keys(vue.Banner).sort()).toEqual([
      "AcceptAll",
      "Actions",
      "Branding",
      "Close",
      "Description",
      "DoNotSell",
      "OpenPreferences",
      "RejectAll",
      "Root",
      "Title",
    ]);
    expect(Object.keys(vue.Preferences).sort()).toEqual([
      "AcceptAll",
      "Branding",
      "Categories",
      "Category",
      "Close",
      "Description",
      "Intro",
      "RejectAll",
      "Root",
      "Save",
      "Title",
    ]);
    expect(Object.keys(vue.OptOut).sort()).toEqual(
      [
        "Branding",
        "Buttons",
        "Cancel",
        "CheckboxLabel",
        "Checkbox",
        "Close",
        "Description",
        "Root",
        "Save",
        "Success",
        "Title",
      ].sort(),
    );
  });
});

/**
 * Vue has one way to start the runtime, and it is the plugin. React's `initCookieYes` and the
 * deprecated `createCookieYes` builder are not shipped, and core's own runtime functions are not
 * re-exported: they would give a second path that bypasses the adapter's facade.
 */
describe("what the package does not export", () => {
  it.each(["initCookieYes", "createCookieYes", "getOrCreateConsentRuntime", "resetConsentRuntime"])(
    "does not export %s",
    (name) => {
      expect(vue).not.toHaveProperty(name);
    },
  );
});

/**
 * The network blocker ships as its own entry point so that consumers who do not use it do not
 * download it. That split only works if this package re-exports the registration function and
 * nothing else: re-exporting the imperative pair would give a second, undocumented path to the
 * same feature, and omitting registration would leave the `networkBlocker` config key unusable.
 */
describe("network blocker surface", () => {
  it("re-exports registerNetworkBlocker, so the config key is usable here", () => {
    expect(typeof vue.registerNetworkBlocker).toBe("function");
  });

  it("does not re-export the imperative install/uninstall pair", () => {
    expect(vue).not.toHaveProperty("installNetworkBlocker");
    expect(vue).not.toHaveProperty("uninstallNetworkBlocker");
  });
});
