import { afterEach, describe, expect, it, vi } from "vitest";
import { _normalizeConfig } from "../config.js";
import { initCookieYes, resetConsentRuntime } from "../runtime.js";
import type { ConsentBackend } from "../types.js";

afterEach(() => {
  resetConsentRuntime();
  vi.restoreAllMocks();
});

describe("_normalizeConfig — regulation alias", () => {
  it("keeps a top-level regulation and maps every common field", () => {
    const onConsentReady = vi.fn();
    const onConsentUpdate = vi.fn();
    const n = _normalizeConfig({
      mode: "offline",
      regulation: "GDPR",
      colorScheme: "dark",
      theme: { primaryColor: "#123456" },
      i18n: { locale: "en" },
      consentCategories: ["analytics"],
      networkBlocker: { rules: [] },
      reloadOnRevoke: true,
      onConsentReady,
      onConsentUpdate,
    });
    expect(n).toMatchObject({
      mode: "offline",
      regulation: "GDPR",
      colorScheme: "dark",
      reloadOnRevoke: true,
    });
    expect(n.theme).toEqual({ primaryColor: "#123456" });
    expect(n.onConsentReady).toBe(onConsentReady);
    expect(n.onConsentUpdate).toBe(onConsentUpdate);
  });

  it("maps the deprecated overrides.regulation when used alone (no warning)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const n = _normalizeConfig({ mode: "offline", overrides: { regulation: "CCPA" } });
    expect(n.regulation).toBe("CCPA");
    expect(warn).not.toHaveBeenCalled();
  });

  it("prefers the top-level regulation and warns once when both are set", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const n = _normalizeConfig({
      mode: "offline",
      regulation: "GDPR",
      overrides: { regulation: "CCPA" },
    });
    expect(n.regulation).toBe("GDPR");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("overrides"));
  });

  it("leaves regulation undefined when neither form is provided", () => {
    const n = _normalizeConfig({ mode: "offline" });
    expect(n.regulation).toBeUndefined();
  });
});

describe("_normalizeConfig — backend keys (self-hosted)", () => {
  it("maps the deprecated backendURL to apiUrl when used alone (no warning)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const n = _normalizeConfig({ mode: "self-hosted", backendURL: "https://a.example/consent" });
    expect(n.apiUrl).toBe("https://a.example/consent");
    expect(warn).not.toHaveBeenCalled();
  });

  it("prefers apiUrl and warns once when both apiUrl and backendURL are set", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const n = _normalizeConfig({
      mode: "self-hosted",
      apiUrl: "https://canonical.example/consent",
      backendURL: "https://legacy.example/consent",
    });
    expect(n.apiUrl).toBe("https://canonical.example/consent");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("backendURL"));
  });

  it("carries apiKey and a custom backend adapter through", () => {
    const backend: ConsentBackend = { persist: vi.fn() };
    const n = _normalizeConfig({
      mode: "self-hosted",
      apiKey: "secret",
      backend,
    });
    expect(n.apiKey).toBe("secret");
    expect(n.backend).toBe(backend);
    expect(n.apiUrl).toBeUndefined();
  });

  it("ignores backend keys entirely in offline mode", () => {
    const n = _normalizeConfig({ mode: "offline" });
    expect(n.apiUrl).toBeUndefined();
    expect(n.apiKey).toBeUndefined();
    expect(n.backend).toBeUndefined();
  });
});

describe("_normalizeConfig — custom taxonomy & stop handlers pass-through", () => {
  it("carries categories, integrations and customStopHandlers through unchanged", () => {
    const categories = [
      { id: "necessary", label: "Necessary", description: "", required: true },
      { id: "marketing", label: "Marketing", description: "" },
    ];
    const integrations = [{ vendor: "hotjar" as const }];
    const customStopHandlers = [{ id: "my-widget", category: "marketing", stop: () => {} }];
    const n = _normalizeConfig({
      mode: "cookie-only",
      categories,
      integrations,
      customStopHandlers,
    });
    expect(n.categories).toBe(categories);
    expect(n.integrations).toBe(integrations);
    expect(n.customStopHandlers).toBe(customStopHandlers);
  });
});

describe("initCookieYes (core) — alias of getOrCreateConsentRuntime", () => {
  it("returns the singleton consent runtime built from the config", () => {
    const runtime = initCookieYes({ mode: "offline", regulation: "CCPA" });
    expect(runtime.consentManager).toBeDefined();
    expect(runtime.consentStore.getState().regulation).toBe("CCPA");
  });

  it("returns the same singleton on a second call", () => {
    const first = initCookieYes({ mode: "offline" });
    const second = initCookieYes({ mode: "offline", regulation: "GDPR" });
    expect(second).toBe(first);
  });
});
