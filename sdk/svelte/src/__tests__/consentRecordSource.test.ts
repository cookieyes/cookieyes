import type { ConsentPayload, CookieYesConfig, Regulation } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import CookieBanner from "../presets/CookieBanner.svelte";
import CookieOptOut from "../presets/CookieOptOut.svelte";
import CookiePreferences from "../presets/CookiePreferences.svelte";
import { getCookieYes } from "../runtime.js";
import ActionsProbe from "./fixtures/ActionsProbe.svelte";
import { clearCookie, click, getByText, mountWith, settle, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

function recorder(regulation: Regulation = "GDPR") {
  const records: ConsentPayload[] = [];
  const config: CookieYesConfig = {
    mode: "self-hosted",
    regulation,
    backend: { persist: (payload) => void records.push(payload) },
  };
  return { config, records };
}

describe("consent record source", () => {
  it('records "banner" for the banner buttons', async () => {
    const { config, records } = recorder();
    mountWith(config, CookieBanner);
    await settle();
    await click(getByText("Accept All"));
    expect(records[0]).toMatchObject({ action: "accept_all", source: "banner" });
  });

  it('records "preferences" for the preferences dialog buttons', async () => {
    const { config, records } = recorder();
    mountWith(config, CookiePreferences);
    getCookieYes().manager.showPreferences();
    await settle();
    await click(getByText("Save My Preferences"));
    expect(records[0]).toMatchObject({ action: "save", source: "preferences" });
  });

  it('records "optout" for the opt-out dialog', async () => {
    const { config, records } = recorder("CCPA");
    mountWith(config, CookieOptOut);
    getCookieYes().showOptOut();
    await settle();
    await click(document.querySelector('input[type="checkbox"]'));
    await click(getByText("Save My Preferences"));
    expect(records[0]).toMatchObject({ action: "reject_all", source: "optout" });
  });

  it("keeps onclick={acceptAll} working, and takes the source from the hook", async () => {
    const { config, records } = recorder();
    mountWith(config, ActionsProbe);
    await click(getByText("plain"));
    await click(getByText("banner"));
    expect(records.map((r) => r.source)).toEqual(["api", "banner"]);
  });
});
