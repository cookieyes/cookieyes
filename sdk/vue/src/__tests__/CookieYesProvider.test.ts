import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h } from "vue";
import { useConsent } from "../composables/useConsent.js";
import { useRegion } from "../composables/useRegion.js";
import { useRegulation } from "../composables/useRegulation.js";
import { CookieYesProvider } from "../context/CookieYesProvider.js";
import { CookieYes } from "../plugin.js";
import {
  clearCookie,
  cookieOnly,
  hydrate,
  mountWith,
  spyWarn,
  ssr,
  unmountAll,
} from "./test-utils.js";

const map = { "US-CA": "CCPA", DE: "GDPR" } as const;

beforeEach(clearCookie);
afterEach(() => {
  unmountAll();
  vi.unstubAllEnvs();
  document.cookie = "__cyd_region=; max-age=0; path=/";
});

type Props = Record<string, unknown>;

/** A tree of `<CookieYesProvider>` around a probe that prints `useRegion()`. */
function tree(props: Props, out: { region?: unknown; regulation?: unknown } = {}) {
  const Probe = defineComponent({
    setup() {
      const region = useRegion();
      const regulation = useRegulation();
      return () => {
        out.region = region.value;
        out.regulation = regulation.value;
        return h("span", regulation.value);
      };
    },
  });
  return defineComponent({ render: () => h(CookieYesProvider, props, () => h(Probe)) });
}

describe("CookieYesProvider", () => {
  it("resolves the regulation from region", () => {
    const out: { region?: unknown; regulation?: unknown } = {};
    mountWith(cookieOnly("GDPR"), tree({ region: { detect: () => "US-CA", map } }, out));
    expect(out.regulation).toBe("CCPA");
    expect(out.region).toMatchObject({ region: "US-CA", regulation: "CCPA", source: "detected" });
  });

  it("lets a manual regulation win over region", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const out: { regulation?: unknown } = {};
    mountWith(
      cookieOnly("DEFAULT"),
      tree({ region: { detect: () => "US-CA", map }, regulation: "GDPR" }, out),
    );
    expect(out.regulation).toBe("GDPR");
  });

  it("supplies a fixed regulation directly", () => {
    const out: { regulation?: unknown } = {};
    mountWith(cookieOnly("GDPR"), tree({ regulation: "CCPA" }, out));
    expect(out.regulation).toBe("CCPA");
  });

  it("falls back to the strictest for an unknown region", () => {
    const out: { region?: unknown } = {};
    mountWith(cookieOnly(), tree({ region: { detect: () => "JP", map } }, out));
    expect(out.region).toMatchObject({
      regulation: "GDPR",
      source: "strictest",
      confidence: "low",
    });
  });

  it("follows prop changes", async () => {
    const Host = defineComponent({
      props: { regulation: { type: String, default: "GDPR" } },
      setup(hostProps) {
        return () =>
          h(CookieYesProvider, { regulation: hostProps.regulation as "GDPR" | "CCPA" }, () =>
            h(
              defineComponent({
                setup() {
                  const r = useRegulation();
                  return () => h("span", r.value);
                },
              }),
            ),
          );
      },
    });
    const wrapper = mountWith(cookieOnly("DEFAULT"), Host);
    expect(wrapper.text()).toBe("GDPR");
    await wrapper.setProps({ regulation: "CCPA" });
    expect(wrapper.text()).toBe("CCPA");
  });

  it("supplies initialConsent to the composables on the server", async () => {
    const stored = {
      consentId: "abc",
      hasActed: true,
      categories: { necessary: true, analytics: true },
      regulation: "GDPR" as const,
    };
    const Probe = defineComponent({
      setup() {
        const consent = useConsent();
        return () =>
          h("b", `${consent.value.hasActed}:${consent.value.committedCategories.analytics}`);
      },
    });
    const html = await ssr(
      () =>
        defineComponent({
          render: () => h(CookieYesProvider, { initialConsent: stored }, () => h(Probe)),
        }),
      cookieOnly("GDPR"),
    );
    expect(html).toContain("true:true");
  });

  it("does not share values between two apps with different providers", () => {
    const a = document.createElement("div");
    const b = document.createElement("div");
    const outA: { regulation?: unknown } = {};
    const outB: { regulation?: unknown } = {};
    const config = cookieOnly("DEFAULT");
    const appA = createApp(tree({ regulation: "GDPR" }, outA));
    const appB = createApp(tree({ regulation: "CCPA" }, outB));
    appA.use(CookieYes, config);
    appB.use(CookieYes, config);
    appA.mount(a);
    appB.mount(b);
    expect(outA.regulation).toBe("GDPR");
    expect(outB.regulation).toBe("CCPA");
    appA.unmount();
    appB.unmount();
  });

  it("renders its default slot", () => {
    const wrapper = mount(CookieYesProvider, { slots: { default: () => h("p", "hello") } });
    expect(wrapper.text()).toBe("hello");
  });

  describe("forcedRegion prop", () => {
    it("overrides region detection in development, tagging the decision forced", () => {
      vi.stubEnv("NODE_ENV", "development");
      const out: { region?: unknown } = {};
      mountWith(
        cookieOnly(),
        tree({ region: { detect: () => "DE", map }, forcedRegion: "US-CA" }, out),
      );
      expect(out.region).toMatchObject({ region: "US-CA", regulation: "CCPA", source: "forced" });
    });

    it("is ignored in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      const out: { region?: unknown } = {};
      mountWith(
        cookieOnly(),
        tree({ region: { detect: () => "DE", map }, forcedRegion: "US-CA" }, out),
      );
      expect(out.region).toMatchObject({ region: "DE", regulation: "GDPR", source: "detected" });
    });

    it("falls back to the browser's override cookie once mounted", async () => {
      vi.stubEnv("NODE_ENV", "development");
      document.cookie = "__cyd_region=US-CA";
      const out: { region?: unknown } = {};
      mountWith(cookieOnly(), tree({ region: { detect: () => "DE", map } }, out));
      await flushPromises();
      expect(out.region).toMatchObject({ source: "forced", region: "US-CA" });
    });

    it("ignores a malformed override cookie instead of throwing", () => {
      vi.stubEnv("NODE_ENV", "development");
      document.cookie = "__cyd_region=%E0%A4%A";
      const out: { region?: unknown } = {};
      mountWith(cookieOnly(), tree({ region: { detect: () => "DE", map } }, out));
      expect(out.region).toMatchObject({ region: "DE", source: "detected" });
    });

    it("hydrates without a mismatch when only the cookie is set, then switches", async () => {
      vi.stubEnv("NODE_ENV", "development");
      document.cookie = "__cyd_region=US-CA";
      const factory = () => tree({ region: { detect: () => "DE", map } });
      // The server never sees the browser cookie, so it renders the real decision.
      const html = await ssr(factory, cookieOnly());
      expect(html).toContain("GDPR");
      const warnings = spyWarn();
      const { container } = await hydrate(html, factory, cookieOnly());
      expect(warnings.vueWarnings()).toEqual([]);
      expect(container.textContent).toBe("CCPA");
    });
  });

  describe("devtools instrumentation", () => {
    type Entry = { k: string; d: unknown };
    type G = typeof globalThis & { __COOKIEYES_DEVTOOLS__?: Entry[] };
    afterEach(() => {
      delete (globalThis as G).__COOKIEYES_DEVTOOLS__;
    });

    it("reports the regulation it resolved, which can differ from the runtime's", () => {
      vi.stubEnv("NODE_ENV", "development");
      delete (globalThis as G).__COOKIEYES_DEVTOOLS__;
      mountWith(cookieOnly("GDPR"), tree({ regulation: "CCPA" }));
      const pushed = ((globalThis as G).__COOKIEYES_DEVTOOLS__ ?? []).filter((e) => e.k === "p");
      expect(pushed[pushed.length - 1]?.d).toMatchObject({ regulation: "CCPA", source: "manual" });
    });

    it("reports nothing in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      delete (globalThis as G).__COOKIEYES_DEVTOOLS__;
      mountWith(cookieOnly("GDPR"), tree({ regulation: "CCPA" }));
      const pushed = ((globalThis as G).__COOKIEYES_DEVTOOLS__ ?? []).filter((e) => e.k === "p");
      expect(pushed).toEqual([]);
    });
  });
});
