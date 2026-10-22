import { describe, expect, it } from "vitest";
import * as ui from "../index.js";

/**
 * Pins the public surface. Every framework adapter builds on these names, so
 * adding or removing one is an API change for all of them: update this list,
 * the docs and the changeset together.
 */
describe("@cookieyes/ui public exports", () => {
  const EXPECTED = [
    "CY_PART",
    "CY_STATE",
    "OPT_OUT_COUNTDOWN_SECONDS",
    "activateDeferredStylesheets",
    "banner",
    "bannerAnnouncer",
    "computeThemeVars",
    "cookieYesLogo",
    "crossIcon",
    "loadThemeRuntime",
    "optOut",
    "preferences",
    "recallButton",
    "reloadNotice",
    "renderToDom",
    "renderToString",
    "revisitIcon",
    "successIcon",
    "warnOnStyleCspViolations",
  ];

  it("exports exactly the expected names", () => {
    expect(Object.keys(ui).sort()).toEqual([...EXPECTED].sort());
  });
});
