import { describe, expect, it } from "vitest";
import * as ui from "../index.js";

/**
 * Pins the public surface. Every framework adapter builds on these names, so
 * adding or removing one is an API change for all of them: update this list,
 * the docs and the changeset together.
 */
describe("@cookieyes/ui public exports", () => {
  const EXPECTED = [
    "ANNOUNCE_DELAY_MS",
    "CY_PART",
    "CY_STATE",
    "FOCUSABLE",
    "OPT_OUT_COUNTDOWN_SECONDS",
    "activateDeferredStylesheets",
    "announceBanner",
    "applyTheme",
    "banner",
    "bannerAnnouncer",
    "bodyPortalRoot",
    "categoryText",
    "closeOnEscape",
    "computeThemeVars",
    "cookieYesLogo",
    "crossIcon",
    "focusDialog",
    "focusRecallAfterBanner",
    "initialOptOutState",
    "isBannerVisible",
    "isRecallVisible",
    "loadThemeRuntime",
    "optOut",
    "optOutReducer",
    "preferences",
    "recallButton",
    "reloadNotice",
    "rememberOpener",
    "renderToDom",
    "renderToString",
    "revisitIcon",
    "startOptOutCountdown",
    "successIcon",
    "trapFocus",
    "warnOnStyleCspViolations",
    "watchPrefersDark",
  ];

  it("exports exactly the expected names", () => {
    expect(Object.keys(ui).sort()).toEqual([...EXPECTED].sort());
  });
});
