import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

describe("parseCookie", () => {
  it("parses a full cookie string", () => {
    const raw =
      "consentid:abc123,consent:yes,action:yes,necessary:yes,functional:no,analytics:yes,performance:no,advertisement:no,lastRenewedDate:1755692567000";
    const result = parseCookie(raw);
    expect(result.consentid).toBe("abc123");
    expect(result.consent).toBe("yes");
    expect(result.action).toBe("yes");
    expect(result.necessary).toBe("yes");
    expect(result.functional).toBe("no");
    expect(result.analytics).toBe("yes");
    expect(result.performance).toBe("no");
    expect(result.advertisement).toBe("no");
    expect(result.lastRenewedDate).toBe("1755692567000");
  });

  it("handles unknown keys gracefully", () => {
    const raw = "consentid:xyz,unknown:value,necessary:yes";
    const result = parseCookie(raw);
    expect(result.consentid).toBe("xyz");
    expect(result.necessary).toBe("yes");
  });
});

describe("serializeCookie", () => {
  it("serializes a snapshot to the canonical format", () => {
    const snap = {
      consentId: "abc123",
      hasActed: true,
      categories: {
        necessary: true,
        functional: true,
        analytics: false,
        performance: false,
        advertisement: false,
      },
      regulation: "GDPR" as const,
      lastRenewed: 1755692567000,
    };

    const result = serializeCookie(snap);
    expect(result).toContain("consentid:abc123");
    expect(result).toContain("consent:yes");
    expect(result).toContain("action:yes");
    expect(result).toContain("necessary:yes");
    expect(result).toContain("functional:yes");
    expect(result).toContain("analytics:no");
    expect(result).toContain("performance:no");
    expect(result).toContain("advertisement:no");
    expect(result).toContain("lastRenewedDate:1755692567000");
  });

  it("round-trips through parse → serialize", () => {
    const original =
      "consentid:abc123,consent:yes,action:yes,necessary:yes,functional:yes,analytics:yes,performance:no,advertisement:no,lastRenewedDate:1755692567000";
    const parsed = parseCookie(original);
    const snapshot = rawFieldsToSnapshot(parsed, "GDPR");
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
  it("sets necessary to true regardless of cookie value", () => {
    const fields = { necessary: "no", analytics: "yes" };
    const snap = rawFieldsToSnapshot(fields, "GDPR");
    expect(snap.categories.necessary).toBe(true);
    expect(snap.categories.analytics).toBe(true);
  });

  it("hasActed is true when action is yes", () => {
    const fields = { action: "yes", consentid: "id1" };
    const snap = rawFieldsToSnapshot(fields, "DEFAULT");
    expect(snap.hasActed).toBe(true);
  });

  it("generates a consentId when the cookie has none", () => {
    const snap = rawFieldsToSnapshot({ action: "no" }, "GDPR");
    expect(snap.consentId).toBeTruthy();
    expect(snap.lastRenewed).toBeUndefined();
  });

  it("parses lastRenewedDate into a number when present", () => {
    const snap = rawFieldsToSnapshot({ lastRenewedDate: "1755692567000" }, "GDPR");
    expect(snap.lastRenewed).toBe(1755692567000);
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
    expect(fields?.functional).toBe("yes");
    expect(fields?.analytics).toBe("no");
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
  it("GDPR: all non-necessary defaults to false", () => {
    const snap = defaultSnapshot("id1", "GDPR");
    expect(snap.categories.necessary).toBe(true);
    expect(snap.categories.functional).toBe(false);
    expect(snap.categories.analytics).toBe(false);
    expect(snap.hasActed).toBe(false);
  });

  it("CCPA: all categories default to true (opt-out model)", () => {
    const snap = defaultSnapshot("id1", "CCPA");
    expect(snap.categories.necessary).toBe(true);
    expect(snap.categories.analytics).toBe(true);
    expect(snap.categories.advertisement).toBe(true);
    expect(snap.hasActed).toBe(false);
  });
});
