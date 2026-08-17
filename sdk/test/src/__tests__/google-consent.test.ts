import { afterEach, describe, expect, it } from "vitest";
import { TEST_HOSTNAME } from "../google-consent.js";
import { createConsentTest } from "../harness.js";
import { resetConsentTestState } from "../reset.js";

afterEach(resetConsentTestState);

/** The signal map from the most recent broadcast. */
function latest(updates: ReturnType<ReturnType<typeof createConsentTest>["googleConsent"]>) {
  return updates[updates.length - 1]?.signals;
}

describe("Google Consent Mode is observable", () => {
  it("captures the broadcast core emits at load", () => {
    const consent = createConsentTest({ googleConsentMode: true });

    const updates = consent.googleConsent();
    expect(updates).toHaveLength(1);
    expect(updates[0]?.action).toBe("update");
    // Fresh GDPR visitor: everything denied except the always-granted one.
    expect(updates[0]?.signals).toEqual({
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      functionality_storage: "denied",
      personalization_storage: "denied",
      security_storage: "granted",
    });
  });

  it("reflects a returning visitor's stored consent at load", () => {
    const consent = createConsentTest({
      googleConsentMode: true,
      initialConsent: { analytics: true },
    });

    expect(latest(consent.googleConsent())?.analytics_storage).toBe("granted");
    expect(latest(consent.googleConsent())?.ad_storage).toBe("denied");
  });

  it("broadcasts again on every decision, oldest first", () => {
    const consent = createConsentTest({ googleConsentMode: true });
    expect(consent.googleConsent()).toHaveLength(1);

    consent.acceptAll();

    const updates = consent.googleConsent();
    expect(updates).toHaveLength(2);
    expect(updates[0]?.signals.analytics_storage).toBe("denied");
    expect(updates[1]?.signals.analytics_storage).toBe("granted");
    expect(updates[1]?.signals.ad_user_data).toBe("granted");
  });

  it("maps the advertisement category to all three ad signals", () => {
    const consent = createConsentTest({ googleConsentMode: true });

    consent.acceptOnly(["advertisement"]);

    const signals = latest(consent.googleConsent());
    expect(signals?.ad_storage).toBe("granted");
    expect(signals?.ad_user_data).toBe("granted");
    expect(signals?.ad_personalization).toBe("granted");
    expect(signals?.analytics_storage).toBe("denied");
  });

  it("denies everything again on withdrawal, keeping security_storage granted", () => {
    const consent = createConsentTest({
      googleConsentMode: true,
      initialConsent: { analytics: true, advertisement: true },
    });

    consent.withdrawAll();

    const signals = latest(consent.googleConsent());
    expect(signals?.analytics_storage).toBe("denied");
    expect(signals?.ad_storage).toBe("denied");
    expect(signals?.security_storage).toBe("granted");
  });

  it("honours a custom taxonomy's own gcm mapping", () => {
    const consent = createConsentTest({
      googleConsentMode: true,
      categories: [
        { id: "essential", required: true },
        { id: "measurement", gcm: ["analytics_storage"] },
      ],
    });

    consent.grant("measurement");

    expect(latest(consent.googleConsent())?.analytics_storage).toBe("granted");
  });

  it("does not broadcast on an uncommitted toggle", () => {
    const consent = createConsentTest({ googleConsentMode: true });
    const before = consent.googleConsent().length;

    consent.toggle("analytics", true);

    expect(consent.googleConsent()).toHaveLength(before);
  });
});

describe("opting out of Consent Mode capture", () => {
  it("throws rather than reporting an empty array that reads like silence", () => {
    const consent = createConsentTest();

    expect(() => consent.googleConsent()).toThrow(/requires `googleConsentMode: true`/);
  });

  it("installs no window unless asked", () => {
    createConsentTest();
    expect(typeof globalThis.window).toBe("undefined");
  });
});

describe("the window shim's documented side effects", () => {
  it("reports the shim hostname on the consent payload while installed", () => {
    const consent = createConsentTest({ mode: "self-hosted", googleConsentMode: true });

    consent.acceptAll();

    // Without the shim core reports "unknown" (sync.ts). Documented in the
    // README's fidelity table, and asserted here so the difference stays known.
    expect(consent.backendCalls()[0]?.domain).toBe(TEST_HOSTNAME);
  });

  it('still reports "unknown" when Consent Mode capture is off', () => {
    const consent = createConsentTest({ mode: "self-hosted" });
    consent.acceptAll();
    expect(consent.backendCalls()[0]?.domain).toBe("unknown");
  });

  it("removes the window again on teardown", () => {
    const consent = createConsentTest({ googleConsentMode: true });
    expect(typeof globalThis.window).toBe("object");

    consent.teardown();

    expect(typeof globalThis.window).toBe("undefined");
  });

  it("does not leak a window into the next harness", () => {
    createConsentTest({ googleConsentMode: true });
    resetConsentTestState();

    const next = createConsentTest();
    expect(typeof globalThis.window).toBe("undefined");
    expect(() => next.googleConsent()).toThrow();
  });
});

describe("a page's own dataLayer pushes are left alone", () => {
  /** The dataLayer core is pushing to, for a test that wants to add noise. */
  function dataLayer(): unknown[] {
    const scope = globalThis as { window?: { dataLayer?: unknown[] } };
    const layer = scope.window?.dataLayer;
    if (!layer) throw new Error("no dataLayer installed");
    return layer;
  }

  it("ignores everything that is not a consent command", () => {
    const consent = createConsentTest({ googleConsentMode: true });
    const fromCore = consent.googleConsent().length;

    // The kinds of things a real GTM container pushes alongside consent.
    dataLayer().push({ event: "page_view", page_path: "/checkout" });
    dataLayer().push(["config", "G-XXXX"]);
    dataLayer().push("a bare string");
    dataLayer().push(null);
    dataLayer().push(42);
    dataLayer().push(["consent"]); // too short to be a real command
    dataLayer().push(["set", "url_passthrough", true]);
    dataLayer().push(["consent", "update", null]); // malformed signal map

    expect(consent.googleConsent()).toHaveLength(fromCore);
  });

  it("still reads a hand-pushed consent command in gtag's array form", () => {
    const consent = createConsentTest({ googleConsentMode: true });
    const before = consent.googleConsent().length;

    // A page setting its own Consent Mode default before our tags load.
    dataLayer().push(["consent", "default", { analytics_storage: "denied" }]);

    const updates = consent.googleConsent();
    expect(updates).toHaveLength(before + 1);
    expect(updates[updates.length - 1]).toEqual({
      action: "default",
      signals: { analytics_storage: "denied" },
    });
  });
});
