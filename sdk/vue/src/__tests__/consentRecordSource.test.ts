import type { ConsentPayload, CookieYesConfig, Regulation } from "@cookieyes/core";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defineComponent, Fragment, h } from "vue";
import { useConsentActions } from "../composables/useConsentActions.js";
import { CookieBanner } from "../presets/CookieBanner.js";
import { CookieOptOut } from "../presets/CookieOptOut.js";
import { CookiePreferences } from "../presets/CookiePreferences.js";
import { getCookieYes } from "../runtime.js";
import { clearCookie, click, getByText, mountWith, unmountAll } from "./test-utils.js";

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
    await flushPromises();
    await click(getByText("Accept All"));
    expect(records[0]).toMatchObject({ action: "accept_all", source: "banner" });
  });

  it('records "preferences" for the preferences dialog buttons', async () => {
    const { config, records } = recorder();
    mountWith(config, CookiePreferences);
    getCookieYes().manager.showPreferences();
    await flushPromises();
    await click(getByText("Save My Preferences"));
    expect(records[0]).toMatchObject({ action: "save", source: "preferences" });
  });

  it('records "optout" for the opt-out dialog', async () => {
    const { config, records } = recorder("CCPA");
    mountWith(config, CookieOptOut);
    getCookieYes().showOptOut();
    await flushPromises();
    await click(document.querySelector('input[type="checkbox"]'));
    await click(getByText("Save My Preferences"));
    expect(records[0]).toMatchObject({ action: "reject_all", source: "optout" });
  });

  it("keeps @click=acceptAll working, and takes the source from the composable", async () => {
    const { config, records } = recorder();
    mountWith(
      config,
      defineComponent({
        setup() {
          const plain = useConsentActions();
          const banner = useConsentActions("banner");
          return () =>
            h(Fragment, null, [
              h("button", { onClick: plain.acceptAll }, "plain"),
              h("button", { onClick: banner.rejectAll }, "banner"),
            ]);
        },
      }),
    );
    await click(getByText("plain"));
    await click(getByText("banner"));
    expect(records.map((r) => r.source)).toEqual(["api", "banner"]);
  });
});
