import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveCategories } from "../categories.js";
import {
  clearConsentCookie,
  defaultSnapshot,
  generateConsentId,
  parseCookie,
  rawFieldsToSnapshot,
  readConsentCookie,
  serializeCookie,
  writeConsentCookie,
} from "../cookie.js";
import type { ConsentSnapshot } from "../types.js";

// The default five taxonomy, used by most cookie tests.
const resolved = resolveCategories();

describe("parseCookie", () => {
  it("parses a full cookie string", () => {
    const raw =
      "consentid:abc123,consent:yes,action:yes,necessary:yes,functional:no,analytics:yes,performance:no,advertisement:no,lastRenewedDate:1755692567000";
    const result = parseCookie(raw);
    expect(result.consentid).toBe("abc123");
    expect(result.consent).toBe("yes");
    expect(result.action).toBe("yes");
    // Category pairs land under `.categories`, keyed by id.
    expect(result.categories.necessary).toBe("yes");
    expect(result.categories.functional).toBe("no");
    expect(result.categories.analytics).toBe("yes");
    expect(result.categories.performance).toBe("no");
    expect(result.categories.advertisement).toBe("no");
    expect(result.lastRenewedDate).toBe("1755692567000");
  });

  it("reads the taxonomy stamp into `tax`", () => {
    const result = parseCookie("consentid:x,tax:abc,necessary:yes");
    expect(result.tax).toBe("abc");
  });

  it("handles unknown keys as categories", () => {
    const raw = "consentid:xyz,custom_marketing:yes,necessary:yes";
    const result = parseCookie(raw);
    expect(result.consentid).toBe("xyz");
    expect(result.categories.custom_marketing).toBe("yes");
    expect(result.categories.necessary).toBe("yes");
  });
});

describe("serializeCookie", () => {
  it("serializes a snapshot to the canonical format", () => {
    const snap: ConsentSnapshot = {
      consentId: "abc123",
      hasActed: true,
      categories: {
        necessary: true,
        functional: true,
        analytics: false,
        performance: false,
        advertisement: false,
      },
      regulation: "GDPR",
      lastRenewed: 1755692567000,
      taxonomyHash: "tax1",
    };

    const result = serializeCookie(snap);
    expect(result).toContain("consentid:abc123");
    expect(result).toContain("consent:yes");
    expect(result).toContain("action:yes");
    expect(result).toContain("tax:tax1");
    expect(result).toContain("necessary:yes");
    expect(result).toContain("functional:yes");
    expect(result).toContain("analytics:no");
    expect(result).toContain("performance:no");
    expect(result).toContain("advertisement:no");
    expect(result).toContain("lastRenewedDate:1755692567000");
  });

  it("serializes arbitrary custom category ids", () => {
    const snap: ConsentSnapshot = {
      consentId: "c1",
      hasActed: true,
      categories: { essential: true, marketing: false },
      regulation: "GDPR",
      taxonomyHash: "tx",
    };
    const result = serializeCookie(snap);
    expect(result).toContain("essential:yes");
    expect(result).toContain("marketing:no");
  });

  it("round-trips through parse → serialize", () => {
    const original =
      "consentid:abc123,consent:yes,action:yes,tax:" +
      resolved.taxonomyHash +
      ",necessary:yes,functional:yes,analytics:yes,performance:no,advertisement:no,lastRenewedDate:1755692567000";
    const parsed = parseCookie(original);
    const snapshot = rawFieldsToSnapshot(parsed, "GDPR", resolved);
    const serialized = serializeCookie(snapshot);
    expect(serialized).toContain("consentid:abc123");
    expect(serialized).toContain("necessary:yes");
    expect(serialized).toContain("analytics:yes");
    expect(serialized).toContain("advertisement:no");
  });
});

describe("generateConsentId", () => {
  it("generates a non-empty string", () => {
    const id = generateConsentId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(10);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateConsentId()));
    expect(ids.size).toBe(100);
  });
});

describe("rawFieldsToSnapshot", () => {
  it("sets necessary (required) to true regardless of cookie value", () => {
    const fields = parseCookie("necessary:no,analytics:yes");
    const snap = rawFieldsToSnapshot(fields, "GDPR", resolved);
    expect(snap.categories.necessary).toBe(true);
    expect(snap.categories.analytics).toBe(true);
  });

  it("hasActed is true when action is yes", () => {
    const fields = parseCookie("action:yes,consentid:id1");
    const snap = rawFieldsToSnapshot(fields, "DEFAULT", resolved);
    expect(snap.hasActed).toBe(true);
  });

  it("generates a consentId when the cookie has none", () => {
    const snap = rawFieldsToSnapshot(parseCookie("action:no"), "GDPR", resolved);
    expect(snap.consentId).toBeTruthy();
    expect(snap.lastRenewed).toBeUndefined();
  });

  it("parses lastRenewedDate into a number when present", () => {
    const snap = rawFieldsToSnapshot(
      parseCookie("lastRenewedDate:1755692567000"),
      "GDPR",
      resolved,
    );
    expect(snap.lastRenewed).toBe(1755692567000);
  });

  it("carries the stored taxonomy stamp through", () => {
    const snap = rawFieldsToSnapshot(parseCookie("tax:xyz,necessary:yes"), "GDPR", resolved);
    expect(snap.taxonomyHash).toBe("xyz");
  });

  it("only includes ids from the resolved taxonomy, defaulting absent ones off", () => {
    const custom = resolveCategories([{ id: "essential", required: true }, { id: "marketing" }]);
    const snap = rawFieldsToSnapshot(parseCookie("essential:yes"), "GDPR", custom);
    expect(snap.categories).toEqual({ essential: true, marketing: false });
  });
});

describe("document cookie I/O", () => {
  const snapshot: ConsentSnapshot = {
    consentId: "cookie-io-id",
    hasActed: true,
    categories: {
      necessary: true,
      functional: true,
      analytics: false,
      performance: false,
      advertisement: false,
    },
    regulation: "GDPR",
    lastRenewed: 1755692567000,
    taxonomyHash: resolved.taxonomyHash,
  };

  beforeEach(() => {
    clearConsentCookie();
  });
  afterEach(() => {
    clearConsentCookie();
  });

  it("writes then reads back the consent cookie", () => {
    writeConsentCookie(snapshot);
    const fields = readConsentCookie();
    expect(fields).not.toBeNull();
    expect(fields?.consentid).toBe("cookie-io-id");
    expect(fields?.categories.functional).toBe("yes");
    expect(fields?.categories.analytics).toBe("no");
  });

  it("returns null when the consent cookie is absent", () => {
    clearConsentCookie();
    document.cookie = "some-other=1; path=/";
    expect(readConsentCookie()).toBeNull();
  });

  it("clearConsentCookie removes the cookie", () => {
    writeConsentCookie(snapshot);
    expect(readConsentCookie()).not.toBeNull();
    clearConsentCookie();
    expect(readConsentCookie()).toBeNull();
  });
});

describe("defaultSnapshot", () => {
  it("GDPR: all non-required defaults to false", () => {
    const snap = defaultSnapshot("id1", "GDPR", resolved);
    expect(snap.categories.necessary).toBe(true);
    expect(snap.categories.functional).toBe(false);
    expect(snap.categories.analytics).toBe(false);
    expect(snap.hasActed).toBe(false);
    expect(snap.taxonomyHash).toBe(resolved.taxonomyHash);
  });

  it("CCPA: all categories default to true (opt-out model)", () => {
    const snap = defaultSnapshot("id1", "CCPA", resolved);
    expect(snap.categories.necessary).toBe(true);
    expect(snap.categories.analytics).toBe(true);
    expect(snap.categories.advertisement).toBe(true);
    expect(snap.hasActed).toBe(false);
  });
});
