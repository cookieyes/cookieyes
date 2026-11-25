import { beforeEach, describe, expect, it, vi } from "vitest";

const kit = vi.hoisted(() => ({
  warn: vi.fn(),
  addPlugin: vi.fn(),
  addComponent: vi.fn(),
  addImports: vi.fn(),
  addServerHandler: vi.fn(),
  addServerPlugin: vi.fn(),
}));

// The module is tested against a fake Nuxt: `defineNuxtModule` returns the definition, and every
// registration is recorded.
vi.mock("@nuxt/kit", () => ({
  defineNuxtModule: (definition: unknown) => definition,
  createResolver: () => ({ resolve: (path: string) => `/pkg/dist/${path.replace("./", "")}` }),
  useLogger: () => ({ warn: kit.warn }),
  addPlugin: kit.addPlugin,
  addComponent: kit.addComponent,
  addImports: kit.addImports,
  addServerHandler: kit.addServerHandler,
  addServerPlugin: kit.addServerPlugin,
}));

const { default: cookieyesModule } = await import("../module.js");

type FakeNuxt = {
  options: {
    dev: boolean;
    app: { baseURL: string };
    build: { transpile: string[] };
    runtimeConfig: { public: Record<string, unknown>; [key: string]: unknown };
    nitro: { static?: boolean; prerender?: { routes?: string[] } };
  };
};

function fakeNuxt(overrides: Partial<FakeNuxt["options"]> = {}): FakeNuxt {
  return {
    options: {
      dev: true,
      app: { baseURL: "/" },
      build: { transpile: [] },
      runtimeConfig: { public: {} },
      nitro: {},
      ...overrides,
    },
  };
}

function setup(options: Record<string, unknown>, nuxt = fakeNuxt()): FakeNuxt {
  (cookieyesModule as unknown as { setup(o: unknown, n: unknown): void }).setup(options, nuxt);
  return nuxt;
}

beforeEach(() => {
  for (const fn of Object.values(kit)) fn.mockClear();
});

describe("the module definition", () => {
  it("uses the cookieyes config key and requires Nuxt 4", () => {
    const { meta } = cookieyesModule as unknown as {
      meta: { configKey: string; compatibility: { nuxt: string } };
    };
    expect(meta.configKey).toBe("cookieyes");
    expect(meta.compatibility.nuxt).toBe(">=4.0.0");
  });
});

describe("module setup", () => {
  it("puts the SDK options in public runtime config, without the module-only keys", () => {
    const nuxt = setup({ regulation: "GDPR", stylesHref: "/x.css", googleConsentMode: true });
    expect(nuxt.options.runtimeConfig.public.cookieyes).toEqual({ regulation: "GDPR" });
  });

  it("warns in development about a function in nuxt.config.ts, which runtime config drops", () => {
    const nuxt = setup({ onConsentUpdate: () => {} });
    expect(kit.warn).toHaveBeenCalledWith(expect.stringContaining("cookieyes.onConsentUpdate"));
    expect(nuxt.options.runtimeConfig.public.cookieyes).toEqual({});
  });

  it("does not warn in production", () => {
    setup({ onConsentUpdate: () => {} }, fakeNuxt({ dev: false }));
    expect(kit.warn).not.toHaveBeenCalled();
  });

  it("registers the plugin, the head plugin and the stylesheet handler", () => {
    const nuxt = setup({});
    expect(kit.addPlugin).toHaveBeenCalledWith("/pkg/dist/runtime/plugin");
    expect(kit.addServerPlugin).toHaveBeenCalledWith("/pkg/dist/runtime/server/head");
    expect(kit.addServerHandler).toHaveBeenCalledWith({
      route: "/cookieyes/styles.css",
      handler: "/pkg/dist/runtime/server/styles",
    });
    expect(nuxt.options.build.transpile).toContain("/pkg/dist/runtime");
  });

  it("auto-imports the components, CookieYesRoot and the composables from this package", () => {
    setup({});
    const components = kit.addComponent.mock.calls.map(
      ([c]) => c as { name: string; filePath: string },
    );
    expect(components.map((c) => c.name)).toEqual(
      expect.arrayContaining([
        "CookieBanner",
        "GatedFrame",
        "YouTubeEmbed",
        "CookieYesProvider",
        "CookieYesRoot",
      ]),
    );
    // Never "@cookieyes/vue" directly: an app that installed only this package cannot resolve it.
    expect(components.every((c) => c.filePath.startsWith("/pkg/dist/runtime/"))).toBe(true);
    const imports = kit.addImports.mock.calls[0]?.[0] as { name: string; from: string }[];
    expect(imports.map((i) => i.name)).toEqual(
      expect.arrayContaining([
        "useConsent",
        "useConsentActions",
        "getCookieYes",
        "youTubeEmbedUrl",
        "Banner",
      ]),
    );
    expect(imports.every((i) => i.from === "/pkg/dist/runtime/vue")).toBe(true);
  });

  it("builds the head markup: critical CSS and the versioned stylesheet path", () => {
    const nuxt = setup({});
    const head = nuxt.options.runtimeConfig.cookieyesHead as { markup: string; stylesPath: string };
    expect(head.markup).toMatch(/^<style>.*<\/style>$/s);
    expect(head.stylesPath).toMatch(/^\/cookieyes\/styles\.css\?v=.+$/);
  });

  it("puts the Consent Mode default first when asked", () => {
    const nuxt = setup({ googleConsentMode: { waitForUpdate: 900 }, stylesHref: "/assets/cy.css" });
    const head = nuxt.options.runtimeConfig.cookieyesHead as { markup: string; stylesPath: string };
    expect(head.markup.startsWith("<script>")).toBe(true);
    expect(head.markup).toContain("gtag('consent','default'");
    expect(head.markup).toContain('"wait_for_update":900');
    expect(head.stylesPath.startsWith("/assets/cy.css?v=")).toBe(true);
  });

  it("bundles the network blocker only when nuxt.config.ts sets rules", () => {
    setup({});
    expect(kit.addPlugin).toHaveBeenCalledTimes(1);
    kit.addPlugin.mockClear();
    setup({ networkBlocker: { rules: [{ id: "x", domain: "x.example", category: "analytics" }] } });
    expect(kit.addPlugin).toHaveBeenCalledWith({
      src: "/pkg/dist/runtime/network-blocker",
      mode: "client",
    });
  });

  it("prerenders the stylesheet only for a static build", () => {
    expect(setup({}).options.nitro.prerender).toBeUndefined();
    const nuxt = setup({}, fakeNuxt({ nitro: { static: true } }));
    expect(nuxt.options.nitro.prerender?.routes).toEqual(["/cookieyes/styles.css"]);
  });
});
