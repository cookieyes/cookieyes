import { resetCookieYes } from "@cookieyes/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSSRApp, inject } from "vue";
import { _CONFIG_KEY } from "../runtime/config.js";
import { fake, resetFake } from "./stubs/nuxt-app.js";

vi.mock("nuxt/app", () => import("./stubs/nuxt-app.js"));

const { default: plugin } = await import("../runtime/plugin.js");

type Plugin = { name: string; enforce: string; setup(nuxtApp: unknown): void };

function run() {
  const vueApp = createSSRApp({ render: () => null });
  (plugin as unknown as Plugin).setup({ vueApp });
  return vueApp;
}

beforeEach(resetFake);
afterEach(() => resetCookieYes());

describe("the Nuxt plugin", () => {
  it("runs before other plugins, so app plugins can use the SDK", () => {
    expect((plugin as unknown as Plugin).enforce).toBe("pre");
  });

  it("starts the SDK with nuxt.config and app.config options merged", () => {
    const onConsentUpdate = () => {};
    fake.runtimeConfig.public.cookieyes = { regulation: "CCPA" };
    fake.appConfig.cookieyes = { onConsentUpdate };
    const app = run();
    const config = app.runWithContext(() => inject(_CONFIG_KEY));
    expect(config).toEqual({ regulation: "CCPA", onConsentUpdate });
  });

  it("starts with an empty request state outside the server", () => {
    run();
    expect(fake.states.get("cookieyes:request")?.value).toEqual({
      read: false,
      initialConsent: null,
      region: undefined,
      forcedRegion: undefined,
    });
  });
});
