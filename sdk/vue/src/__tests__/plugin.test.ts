import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h } from "vue";
import { useConsentRuntime } from "../composables/useConsentRuntime.js";
import { CookieYes } from "../plugin.js";
import { _tryGetCookieYes, getCookieYes, resetCookieYes } from "../runtime.js";
import { clearCookie, cookieOnly, installOnly, mountWith, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

const Probe = defineComponent({
  setup() {
    useConsentRuntime();
    return () => h("div");
  },
});

describe("CookieYes plugin", () => {
  it("provides the runtime to the app and registers it for getCookieYes()", () => {
    const config = cookieOnly("GDPR");
    let seen: unknown;
    mountWith(
      config,
      defineComponent({
        setup() {
          seen = useConsentRuntime();
          return () => h("div");
        },
      }),
    );
    expect(seen).toBe(getCookieYes());
  });

  it("registers no global component", () => {
    const app = installOnly(cookieOnly());
    expect(app.component("CookieBanner")).toBeUndefined();
    expect(app.component("CookieYesProvider")).toBeUndefined();
  });

  it("reuses the runtime when the same config object is installed again", () => {
    const config = cookieOnly();
    installOnly(config);
    const first = getCookieYes();
    installOnly(config);
    expect(getCookieYes()).toBe(first);
  });

  it("builds one manager across many per-request installs of a shared config", () => {
    const config = cookieOnly();
    installOnly(config);
    const first = getCookieYes();
    for (let i = 0; i < 50; i++) installOnly(config);
    expect(getCookieYes().manager).toBe(first.manager);
  });

  it("replaces the runtime and warns when a browser app installs a different config", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mountWith(cookieOnly("GDPR"));
    installOnly(cookieOnly("CCPA"));
    expect(getCookieYes().getSnapshot().regulation).toBe("CCPA");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("ran again with a different config"));
  });

  it("replaces the runtime silently on a server, where install runs once per request", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal("document", undefined);
    try {
      installOnly(cookieOnly("GDPR"));
      installOnly(cookieOnly("CCPA"));
    } finally {
      vi.unstubAllGlobals();
    }
    expect(getCookieYes().getSnapshot().regulation).toBe("CCPA");
    expect(warn).not.toHaveBeenCalled();
  });

  it("makes a component in an app without the plugin fail with the one error", () => {
    installOnly(cookieOnly());
    const other = createApp(Probe);
    other.config.warnHandler = () => undefined;
    expect(() => other.mount(document.createElement("div"))).toThrow(/could not find CookieYes/);
  });

  it("throws for self-hosted mode without a backend", () => {
    expect(() => installOnly({ mode: "self-hosted" })).toThrow(/requires either backend or apiUrl/);
  });

  it("does not tear anything down on unmount", async () => {
    const wrapper = mountWith(cookieOnly());
    wrapper.unmount();
    await flushPromises();
    expect(_tryGetCookieYes()).not.toBeNull();
  });
});

describe("portal root", () => {
  it("exists as the first child of body after install", () => {
    document.body.innerHTML = "<main></main>";
    installOnly(cookieOnly());
    const root = document.getElementById("cookieyes-portal-root");
    expect(root).not.toBeNull();
    expect(document.body.firstElementChild).toBe(root);
  });

  it("is not duplicated by a second install", () => {
    installOnly(cookieOnly());
    installOnly(cookieOnly());
    expect(document.querySelectorAll("#cookieyes-portal-root")).toHaveLength(1);
  });

  it("is removed by resetCookieYes when empty", () => {
    installOnly(cookieOnly());
    resetCookieYes();
    expect(document.getElementById("cookieyes-portal-root")).toBeNull();
  });

  it("is kept by resetCookieYes while it still holds content", () => {
    installOnly(cookieOnly());
    document.getElementById("cookieyes-portal-root")?.append(document.createElement("span"));
    resetCookieYes();
    expect(document.getElementById("cookieyes-portal-root")).not.toBeNull();
  });
});

describe("plugin typing", () => {
  it("accepts the config type core exports", () => {
    const app = createApp({ render: () => null });
    app.use(CookieYes, { mode: "cookie-only", regulation: "GDPR" });
    expect(true).toBe(true);
  });
});
