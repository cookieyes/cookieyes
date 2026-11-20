import { render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import GatedFrame from "../controls/GatedFrame.svelte";
import GatedScript from "../controls/GatedScript.svelte";
import RecallButton from "../controls/RecallButton.svelte";
import { useBannerVisibility } from "../hooks/useBannerVisibility.svelte.js";
import { useCategories } from "../hooks/useCategories.js";
import { useConsent } from "../hooks/useConsent.svelte.js";
import { useConsentActions } from "../hooks/useConsentActions.js";
import { useConsentCategory } from "../hooks/useConsentCategory.svelte.js";
import { useLanguage } from "../hooks/useLanguage.svelte.js";
import { useOptOutOpen } from "../hooks/useOptOutOpen.svelte.js";
import { usePreferencesOpen } from "../hooks/usePreferencesOpen.svelte.js";
import { useRegion } from "../hooks/useRegion.svelte.js";
import { useRegulation } from "../hooks/useRegulation.svelte.js";
import { useReloadNotice } from "../hooks/useReloadNotice.svelte.js";
import { useTranslations } from "../hooks/useTranslations.svelte.js";
import CookieBanner from "../presets/CookieBanner.svelte";
import CookieOptOut from "../presets/CookieOptOut.svelte";
import CookiePreferences from "../presets/CookiePreferences.svelte";
import ReloadNotice from "../presets/ReloadNotice.svelte";
import * as OptOut from "../primitives/opt-out/index.js";
import * as Preferences from "../primitives/preferences/index.js";
import HookProbe from "./fixtures/HookProbe.svelte";
import { cookieOnly, mountWith, unmountAll } from "./test-utils.js";

afterEach(unmountAll);

const PREFERENCES_MESSAGE =
  "[cookieyes] Preferences.* sub-components must be rendered inside <Preferences.Root>.";
const OPT_OUT_MESSAGE =
  "[cookieyes] OptOut.* sub-components must be rendered inside <OptOut.Root>.";

/** The one error `_useContext` throws when no provider is above the caller. */
function missingProvider(name: string): string {
  return `[cookieyes] ${name} could not find CookieYes. Wrap the app in <CookieYesProvider config={...}> and call hooks while a component initialises.`;
}

describe("Preferences parts outside Preferences.Root", () => {
  const parts = { Title: Preferences.Title };

  it.each(Object.entries(parts))("%s throws the message that names the fix", (_name, part) => {
    expect(() => mountWith(cookieOnly(), part)).toThrow(PREFERENCES_MESSAGE);
  });
});

describe("OptOut parts outside OptOut.Root", () => {
  const parts = {
    Title: OptOut.Title,
    Checkbox: OptOut.Checkbox,
    Save: OptOut.Save,
    Buttons: OptOut.Buttons,
    Success: OptOut.Success,
  };

  it.each(Object.entries(parts))("%s throws the message that names the fix", (_name, part) => {
    expect(() => mountWith(cookieOnly(), part)).toThrow(OPT_OUT_MESSAGE);
  });
});

describe("stock components without a CookieYesProvider", () => {
  it("<CookieBanner> throws the one missing-provider error", () => {
    expect(() => render(CookieBanner)).toThrow(missingProvider("<CookieBanner>"));
  });

  it("<CookiePreferences> throws the one missing-provider error", () => {
    expect(() => render(CookiePreferences)).toThrow(missingProvider("<CookiePreferences>"));
  });

  it("<CookieOptOut> throws the one missing-provider error", () => {
    expect(() => render(CookieOptOut)).toThrow(missingProvider("<CookieOptOut>"));
  });

  it("<ReloadNotice> throws the one missing-provider error", () => {
    expect(() => render(ReloadNotice)).toThrow(missingProvider("<ReloadNotice>"));
  });

  it("<RecallButton> throws the one missing-provider error", () => {
    expect(() => render(RecallButton)).toThrow(missingProvider("<RecallButton>"));
  });

  it("<GatedScript> throws the one missing-provider error", () => {
    expect(() =>
      render(GatedScript, {
        props: { id: "x", src: "https://cdn.example.com/x.js", category: "analytics" },
      }),
    ).toThrow(missingProvider("<GatedScript>"));
  });

  it("<GatedFrame> throws the one missing-provider error", () => {
    expect(() =>
      render(GatedFrame, {
        props: { src: "https://www.example.com/embed", category: "advertisement" },
      }),
    ).toThrow(missingProvider("<GatedFrame>"));
  });
});

describe("hooks without a CookieYesProvider", () => {
  const hooks = {
    useBannerVisibility: () => useBannerVisibility(),
    useCategories: () => useCategories(),
    useConsent: () => useConsent(),
    useConsentActions: () => useConsentActions(),
    useConsentCategory: () => useConsentCategory("analytics"),
    useLanguage: () => useLanguage(),
    useOptOutOpen: () => useOptOutOpen(),
    usePreferencesOpen: () => usePreferencesOpen(),
    useRegion: () => useRegion(),
    useRegulation: () => useRegulation(),
    useReloadNotice: () => useReloadNotice(),
    useTranslations: () => useTranslations(),
  };

  it.each(Object.entries(hooks))("%s throws the one missing-provider error", (name, use) => {
    expect(() => render(HookProbe, { props: { use } })).toThrow(missingProvider(`${name}()`));
  });
});
