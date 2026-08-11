import { parseCookie } from "@cookieyes/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSENT_COOKIE_NAME } from "../document.js";
import { createConsentTest } from "../harness.js";
import { resetConsentTestState } from "../reset.js";
import { SEED_LAST_RENEWED, seedConsentCookie } from "../seed.js";

afterEach(() => {
  resetConsentTestState();
  vi.unstubAllGlobals();
});

/** Read whatever the seed wrote back out of the jar, through core's own parser. */
function storedCookie(): ReturnType<typeof parseCookie> {
  const raw = (globalThis.document as unknown as { cookie: string }).cookie;
  const match = raw.split("; ").find((pair) => pair.startsWith(`${CONSENT_COOKIE_NAME}=`));
  return parseCookie(decodeURIComponent((match ?? "").slice(CONSENT_COOKIE_NAME.length + 1)));
}

describe("seeding through the harness", () => {
  it("leaves a brand-new visitor unseeded when initialConsent is omitted", () => {
    const consent = createConsentTest();
    expect(consent.snapshot().hasActed).toBe(false);
  });

  it("treats an empty initialConsent as a returning visitor who agreed to nothing", () => {
    const consent = createConsentTest({ initialConsent: {} });
    const snapshot = consent.snapshot();

    expect(snapshot.hasActed).toBe(true);
    expect(snapshot.committed).toEqual({
      necessary: true,
      functional: false,
      analytics: false,
      performance: false,
      advertisement: false,
    });
  });

  it("seeds a partial state", () => {
    const consent = createConsentTest({
      initialConsent: { analytics: true, advertisement: false },
    });
    expect(consent.has("analytics")).toBe(true);
    expect(consent.has("advertisement")).toBe(false);
  });

  it("seeds everything on", () => {
    const consent = createConsentTest({
      initialConsent: {
        functional: true,
        analytics: true,
        performance: true,
        advertisement: true,
      },
    });
    for (const id of consent.categories) expect(consent.has(id)).toBe(true);
  });

  it("forces required categories on even when seeded false", () => {
    const consent = createConsentTest({ initialConsent: { necessary: false } });
    expect(consent.has("necessary")).toBe(true);
  });

  it("reports an unknown seed key immediately, before the engine is built", () => {
    expect(() => createConsentTest({ initialConsent: { analytcs: true } as never })).toThrow(
      /Unknown consent category "analytcs"/,
    );
  });

  it("uses a fixed lastRenewed so a seeded snapshot is deterministic", () => {
    const consent = createConsentTest({ initialConsent: { analytics: true } });
    expect(consent.snapshot().lastRenewed).toBe(SEED_LAST_RENEWED);
  });

  it("honours a caller-supplied consentId, and generates a real one otherwise", () => {
    const fixed = createConsentTest({
      initialConsent: { analytics: true },
      consentId: "fixed-id-for-assertions",
    });
    expect(fixed.snapshot().consentId).toBe("fixed-id-for-assertions");
    resetConsentTestState();

    const generated = createConsentTest({ initialConsent: { analytics: true } });
    // Core's own generateConsentId — an opaque base64url id, not a test stub.
    expect(generated.snapshot().consentId).toMatch(/^[\w-]{40,44}$/);
    expect(generated.snapshot().consentId).not.toBe("fixed-id-for-assertions");
  });

  it("stamps the taxonomy hash so core accepts the seeded cookie as current", () => {
    const consent = createConsentTest({ initialConsent: { analytics: true } });
    expect(consent.snapshot().taxonomyHash).toBe(consent.store.categories.taxonomyHash);
    // Accepted, not discarded: a rejected cookie would have reset hasActed.
    expect(consent.snapshot().hasActed).toBe(true);
  });
});

describe("seedConsentCookie as a standalone primitive", () => {
  it("returns null and writes nothing for a brand-new visitor", () => {
    expect(seedConsentCookie()).toBeNull();
    expect(storedCookie().action).toBeUndefined();
  });

  it("writes a cookie core can parse, using core's own serializer", () => {
    const snapshot = seedConsentCookie({ initialConsent: { analytics: true } });

    expect(snapshot).not.toBeNull();
    const stored = storedCookie();
    expect(stored.action).toBe("yes");
    expect(stored.categories.analytics).toBe("yes");
    expect(stored.categories.advertisement).toBe("no");
    expect(stored.consentid).toBe(snapshot?.consentId);
  });

  it("serializes a custom taxonomy's ids", () => {
    seedConsentCookie({
      categories: [{ id: "essential", required: true }, { id: "marketing" }],
      initialConsent: { marketing: true },
    });

    const stored = storedCookie();
    expect(stored.categories.essential).toBe("yes");
    expect(stored.categories.marketing).toBe("yes");
    expect(stored.categories.analytics).toBeUndefined();
  });

  it("records the regulation it was seeded with", () => {
    const snapshot = seedConsentCookie({ regulation: "CCPA", initialConsent: {} });
    expect(snapshot?.regulation).toBe("CCPA");
  });

  it("throws on an unknown seed key", () => {
    expect(() => seedConsentCookie({ initialConsent: { nope: true } as never })).toThrow(
      /Unknown consent category "nope"/,
    );
  });

  it("writes into an existing document instead of shimming one", () => {
    const existing = { cookie: "" };
    vi.stubGlobal("document", existing);

    seedConsentCookie({ initialConsent: { analytics: true } });

    expect(existing.cookie).toContain(`${CONSENT_COOKIE_NAME}=`);
  });
});
