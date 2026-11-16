import { readServerConsent } from "@cookieyes/core";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Component, defineComponent, h, nextTick } from "vue";
import { useConsent } from "../composables/useConsent.js";
import { CookieYesProvider } from "../context/CookieYesProvider.js";
import { getCookieYes } from "../runtime.js";
import {
  clearCookie,
  cookieOnly,
  hydrate,
  mountWith,
  spyWarn,
  ssr,
  unmountAll,
} from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

function probe(renders: string[], withProvider?: Record<string, unknown>): () => Component {
  const Probe = defineComponent({
    setup() {
      const consent = useConsent();
      return () => {
        renders.push(String(consent.value.hasActed));
        return h("span", String(consent.value.hasActed));
      };
    },
  });
  return () =>
    withProvider
      ? defineComponent({ render: () => h(CookieYesProvider, withProvider, () => h(Probe)) })
      : Probe;
}

describe("useSnapshot (through useConsent)", () => {
  it("renders the server snapshot on the server, and folds initialConsent in", async () => {
    const config = cookieOnly("GDPR");
    const first = await ssr(probe([]), config);
    expect(first).toContain("false");

    mountWith(config);
    getCookieYes().manager.acceptAll();
    const stored = readServerConsent(document.cookie, { regulation: "GDPR" });
    expect(stored?.hasActed).toBe(true);
    unmountAll();
    const html = await ssr(probe([], { initialConsent: stored }), config);
    expect(html).toContain("true");
  });

  it("keeps regulation from the request, not from the stored consent", async () => {
    const config = cookieOnly("GDPR");
    const html = await ssr(
      () =>
        defineComponent({
          render: () =>
            h(
              CookieYesProvider,
              {
                initialConsent: {
                  consentId: "x",
                  hasActed: true,
                  categories: { necessary: true },
                  regulation: "CCPA",
                },
              },
              () =>
                h(
                  defineComponent({
                    setup() {
                      const consent = useConsent();
                      return () => h("i", consent.value.regulation);
                    },
                  }),
                ),
            ),
        }),
      config,
    );
    expect(html).toContain("GDPR");
  });

  it("hydrates on the server snapshot and then switches to live with no warning", async () => {
    const config = cookieOnly("GDPR");
    const html = await ssr(probe([]), config);
    getCookieYes().manager.acceptAll();
    const warnings = spyWarn();
    const renders: string[] = [];
    const { container } = await hydrate(html, probe(renders), config);
    expect(warnings.vueWarnings()).toEqual([]);
    expect(renders[0]).toBe("false");
    expect(container.textContent).toBe("true");
  });

  it("reads live at once on a plain client mount, without a second render", async () => {
    const renders: string[] = [];
    mountWith(cookieOnly(), probe(renders)());
    getCookieYes().manager.acceptAll();
    await nextTick();
    await flushPromises();
    expect(renders).toEqual(["false", "true"]);
  });
});
