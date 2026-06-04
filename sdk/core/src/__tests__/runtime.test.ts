import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOrCreateConsentRuntime, resetConsentRuntime } from "../runtime.js";
import type { ConsentChangePayload, ConsentPayload } from "../types.js";

function clearCookie(): void {
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
}

beforeEach(clearCookie);
afterEach(() => {
  resetConsentRuntime();
  clearCookie();
  vi.restoreAllMocks();
});

describe("getOrCreateConsentRuntime", () => {
  it("returns a singleton until reset", () => {
    const a = getOrCreateConsentRuntime({ mode: "offline" });
    const b = getOrCreateConsentRuntime({ mode: "offline" });
    expect(a).toBe(b);
    resetConsentRuntime();
    const c = getOrCreateConsentRuntime({ mode: "offline" });
    expect(c).not.toBe(a);
  });

  it("exposes both the manager and the store", () => {
    const rt = getOrCreateConsentRuntime({ mode: "offline" });
    expect(rt.consentManager).toBeDefined();
    expect(typeof rt.consentStore.getState).toBe("function");
    expect(typeof rt.consentStore.subscribe).toBe("function");
  });

  it("applies the regulation override", () => {
    const rt = getOrCreateConsentRuntime({ mode: "offline", overrides: { regulation: "GDPR" } });
    expect(rt.consentStore.getState().regulation).toBe("GDPR");
  });
});

describe("consentStore state machine", () => {
  it("starts in the banner UI with only necessary granted", () => {
    const { consentStore } = getOrCreateConsentRuntime({ mode: "offline" });
    const state = consentStore.getState();
    expect(state.hasActed).toBe(false);
    expect(state.activeUI).toBe("banner");
    expect(state.has("necessary")).toBe(true);
    expect(state.has("analytics")).toBe(false);
  });

  it("saveConsents('all') grants every category and clears the banner", () => {
    const { consentStore } = getOrCreateConsentRuntime({ mode: "offline" });
    consentStore.getState().saveConsents("all");
    const state = consentStore.getState();
    expect(state.has("analytics")).toBe(true);
    expect(state.has("advertisement")).toBe(true);
    expect(state.activeUI).toBeNull();
  });

  it("saveConsents('necessary') denies everything but necessary", () => {
    const { consentStore } = getOrCreateConsentRuntime({ mode: "offline" });
    consentStore.getState().saveConsents("necessary");
    const state = consentStore.getState();
    expect(state.has("necessary")).toBe(true);
    expect(state.has("analytics")).toBe(false);
  });

  it("saveConsents([...]) accepts the selected categories", () => {
    const { consentStore } = getOrCreateConsentRuntime({ mode: "offline" });
    consentStore.getState().saveConsents(["analytics"]);
    const state = consentStore.getState();
    expect(state.has("analytics")).toBe(true);
    expect(state.has("advertisement")).toBe(false);
  });

  it("setConsent toggles a single category", () => {
    const { consentStore } = getOrCreateConsentRuntime({ mode: "offline" });
    consentStore.getState().setConsent("analytics", true);
    expect(consentStore.getState().has("analytics")).toBe(true);
  });

  it("reports the dialog UI while preferences are open", () => {
    const { consentManager, consentStore } = getOrCreateConsentRuntime({ mode: "offline" });
    consentManager.showPreferences();
    expect(consentStore.getState().activeUI).toBe("dialog");
  });

  it("subscribe notifies listeners on change", () => {
    const { consentStore } = getOrCreateConsentRuntime({ mode: "offline" });
    const listener = vi.fn();
    const unsub = consentStore.subscribe(listener);
    consentStore.getState().saveConsents("all");
    expect(listener).toHaveBeenCalled();
    unsub();
  });

  it("subscribeToConsentChanges emits allowed/denied splits on save", () => {
    const { consentStore } = getOrCreateConsentRuntime({ mode: "offline" });
    let payload: ConsentChangePayload | undefined;
    const changes = vi.fn((p: ConsentChangePayload) => {
      payload = p;
    });
    consentStore.getState().subscribeToConsentChanges(changes);
    consentStore.getState().saveConsents("all");

    expect(changes).toHaveBeenCalledTimes(1);
    expect(payload?.allowedCategories).toContain("analytics");
    expect(payload?.deniedCategories).toEqual([]);
  });
});

describe("self-hosted backend wiring", () => {
  it("forwards the payload to a custom backend adapter on save", () => {
    let captured: ConsentPayload | undefined;
    const persist = vi.fn((p: ConsentPayload) => {
      captured = p;
    });
    const { consentStore } = getOrCreateConsentRuntime({
      mode: "self-hosted",
      backend: { persist },
    });
    consentStore.getState().saveConsents("all");
    expect(persist).toHaveBeenCalledTimes(1);
    expect(captured).toHaveProperty("consentId");
  });
});
