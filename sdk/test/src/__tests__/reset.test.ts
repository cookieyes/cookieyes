import { afterEach, describe, expect, it } from "vitest";
import { isDocumentShimmed } from "../document.js";
import { createConsentTest } from "../harness.js";
import { resetConsentTestState } from "../reset.js";
import { seedConsentCookie } from "../seed.js";

afterEach(resetConsentTestState);

describe("every run starts completely clean", () => {
  it("does not carry consent from one harness into the next", () => {
    const first = createConsentTest({ initialConsent: { analytics: true, advertisement: true } });
    expect(first.has("analytics")).toBe(true);

    // Note: no teardown() — a forgetful test is exactly the case that must be safe.
    const second = createConsentTest();

    expect(second.has("analytics")).toBe(false);
    expect(second.snapshot().hasActed).toBe(false);
  });

  it("does not carry recorded events or snapshots into the next harness", () => {
    const first = createConsentTest();
    first.acceptAll();
    expect(first.events().length).toBeGreaterThan(0);

    const second = createConsentTest();

    expect(second.events()).toEqual([]);
    expect(second.snapshots()).toEqual([]);
    expect(second.backendCalls()).toEqual([]);
  });

  it("gives each harness its own consent id", () => {
    const first = createConsentTest({ initialConsent: {} });
    const firstId = first.snapshot().consentId;
    const second = createConsentTest({ initialConsent: {} });

    expect(second.snapshot().consentId).not.toBe(firstId);
  });

  it("drops a cookie left behind by a bare seedConsentCookie call", () => {
    seedConsentCookie({ initialConsent: { analytics: true } });

    const consent = createConsentTest();

    expect(consent.has("analytics")).toBe(false);
  });

  it("returns the document to how it found it", () => {
    createConsentTest();
    expect(isDocumentShimmed()).toBe(true);

    resetConsentTestState();

    expect(isDocumentShimmed()).toBe(false);
    expect(typeof globalThis.document).toBe("undefined");
  });

  it("is safe to call before anything has been set up, and to repeat", () => {
    expect(() => resetConsentTestState()).not.toThrow();
    expect(() => resetConsentTestState()).not.toThrow();

    const consent = createConsentTest();
    consent.teardown();
    expect(() => consent.teardown()).not.toThrow();
  });
});
