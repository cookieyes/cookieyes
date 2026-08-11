import type { ConsentEventPayload, ConsentPayload, ConsentSnapshot } from "@cookieyes/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createConsentTest } from "../harness.js";
import { resetConsentTestState } from "../reset.js";

afterEach(resetConsentTestState);

describe("every signal the SDK sends is observable", () => {
  it("records nothing before the visitor acts", () => {
    const consent = createConsentTest();
    expect(consent.events()).toEqual([]);
    expect(consent.backendCalls()).toEqual([]);
  });

  it("records a save and a change when consent actually differs", () => {
    const consent = createConsentTest();

    consent.grant("analytics");

    expect(consent.events("save")).toHaveLength(1);
    expect(consent.events("change")).toHaveLength(1);
    expect(consent.events("change")[0]?.changedCategories).toEqual(["analytics"]);
    expect(consent.events()).toHaveLength(2);
  });

  it("records a save but no change on a re-confirm — core's distinction, inherited", () => {
    const consent = createConsentTest();
    consent.grant("analytics");
    const changesBefore = consent.events("change").length;

    consent.save(); // same values, saved again

    expect(consent.events("save")).toHaveLength(2);
    expect(consent.events("change")).toHaveLength(changesBefore);
  });

  it("replays current state to a listener on attach, marked isInitial", () => {
    const consent = createConsentTest({ initialConsent: { analytics: true } });
    const seen: ConsentEventPayload[] = [];

    consent.on("save", (payload) => seen.push(payload));

    expect(seen).toHaveLength(1);
    expect(seen[0]?.isInitial).toBe(true);
    expect(seen[0]?.categories.analytics).toBe(true);
    expect(seen[0]?.changedCategories).toEqual([]);
  });

  it("keeps the isInitial replay out of events(), which logs real decisions only", () => {
    const consent = createConsentTest();
    consent.on("save", () => undefined);
    expect(consent.events()).toEqual([]);
  });

  it("filters a listener down to one category", () => {
    const consent = createConsentTest();
    const analytics = vi.fn();

    consent.on("change", analytics, { category: "analytics" });
    analytics.mockClear(); // drop the isInitial replay

    consent.grant("advertisement");
    expect(analytics).not.toHaveBeenCalled();

    consent.grant("analytics");
    expect(analytics).toHaveBeenCalledTimes(1);
  });

  it("rejects an unknown category in a listener filter", () => {
    const consent = createConsentTest();
    expect(() =>
      consent.on("change", () => undefined, { category: "analytcs" as "analytics" }),
    ).toThrow(/Unknown consent category/);
  });

  it("returns an unsubscribe function from on()", () => {
    const consent = createConsentTest();
    const listener = vi.fn();
    const off = consent.on("save", listener);
    listener.mockClear();

    off();
    consent.acceptAll();

    expect(listener).not.toHaveBeenCalled();
  });

  it("exposes snapshot subscriptions, which fire on uncommitted toggles too", () => {
    const consent = createConsentTest();
    const seen: ConsentSnapshot[] = [];
    const off = consent.subscribe((state) => seen.push(state));

    consent.toggle("analytics", true);

    expect(seen).toHaveLength(1);
    expect(seen[0]?.categories.analytics).toBe(true);
    off();
  });

  it("records every snapshot core pushed, in order", () => {
    const consent = createConsentTest();
    consent.acceptAll();
    consent.rejectAll();

    const recorded = consent.snapshots();
    expect(recorded.length).toBeGreaterThanOrEqual(2);
    expect(recorded[0]?.categories.analytics).toBe(true);
    expect(recorded[recorded.length - 1]?.categories.analytics).toBe(false);
  });

  it("fires the config callbacks core owns", async () => {
    const onConsentReady = vi.fn();
    const onConsentUpdate = vi.fn();
    const consent = createConsentTest({ onConsentReady, onConsentUpdate });

    await consent.whenReady();
    expect(onConsentReady).toHaveBeenCalledTimes(1);

    consent.acceptAll();
    expect(onConsentUpdate).toHaveBeenCalledTimes(1);
  });

  it("resolves whenReady on production's single microtask", async () => {
    const consent = createConsentTest();
    // Not resolved synchronously — core defers onConsentReady by one microtask,
    // and the harness mirrors that rather than inventing its own timing.
    let resolved = false;
    void consent.whenReady().then(() => {
      resolved = true;
    });
    expect(resolved).toBe(false);

    await consent.whenReady();
    expect(resolved).toBe(true);
  });
});

describe("self-hosted mode captures payloads instead of sending them", () => {
  it("records the exact ConsentPayload on every decision", () => {
    const consent = createConsentTest({ mode: "self-hosted", regulation: "GDPR" });

    consent.acceptOnly(["analytics"]);

    const calls = consent.backendCalls();
    expect(calls).toHaveLength(1);
    const payload = calls[0] as ConsentPayload;
    expect(payload.regulation).toBe("GDPR");
    expect(payload.categories.analytics).toBe(true);
    expect(payload.categories.advertisement).toBe(false);
    expect(payload.consentId).toBe(consent.snapshot().consentId);
    // No window in a node test, so core reports the domain it can't determine.
    expect(payload.domain).toBe("unknown");
  });

  it("snapshots each payload so a later decision cannot rewrite an earlier record", () => {
    const consent = createConsentTest({ mode: "self-hosted" });

    consent.acceptAll();
    consent.rejectAll();

    const calls = consent.backendCalls();
    expect(calls).toHaveLength(2);
    expect(calls[0]?.categories.analytics).toBe(true);
    expect(calls[1]?.categories.analytics).toBe(false);
  });

  it("wraps a caller-supplied backend rather than replacing it", async () => {
    const persist = vi.fn();
    const consent = createConsentTest({ mode: "self-hosted", backend: { persist } });

    consent.acceptAll();

    expect(persist).toHaveBeenCalledTimes(1);
    expect(consent.backendCalls()).toHaveLength(1);
  });

  it("records no backend calls in cookie-only mode, where core never persists remotely", () => {
    const consent = createConsentTest({ mode: "cookie-only" });
    consent.acceptAll();
    expect(consent.backendCalls()).toEqual([]);
  });
});
