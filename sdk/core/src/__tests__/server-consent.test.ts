// @vitest-environment node
//
// Deliberately node, not the package default of jsdom: `readServerConsent` runs
// on a server and must never touch `document`. Under jsdom a stray `document`
// reference would work and the test would prove nothing.
import { describe, expect, it } from "vitest";
import { resolveCategories } from "../categories.js";
import { serializeCookie } from "../cookie.js";
import { readServerConsent } from "../server-consent.js";
import type { ConsentSnapshot } from "../types.js";

/** Build a real `Cookie:` header the way a browser would send one. */
function header(snapshot: ConsentSnapshot, extras: string[] = []): string {
  const value = encodeURIComponent(serializeCookie(snapshot));
  return [...extras, `cookieyes-consent=${value}`].join("; ");
}

function accepted(overrides: Partial<ConsentSnapshot> = {}): ConsentSnapshot {
  const resolved = resolveCategories();
  return {
    consentId: "test-consent-id",
    hasActed: true,
    categories: {
      necessary: true,
      functional: true,
      analytics: true,
      performance: false,
      advertisement: false,
    },
    regulation: "GDPR",
    lastRenewed: 1_700_000_000_000,
    taxonomyHash: resolved.taxonomyHash,
    ...overrides,
  };
}

describe("readServerConsent: no decision on record → null (show the banner)", () => {
  it("returns null for an empty header", () => {
    expect(readServerConsent("")).toBeNull();
  });

  it("returns null when the consent cookie is absent", () => {
    expect(readServerConsent("session=abc; theme=dark")).toBeNull();
  });

  it("returns null for a cookie recording no explicit choice", () => {
    // e.g. a CCPA visitor: the client writes an implicit-consent cookie at load
    // with action:no. They have not chosen, so the banner must still show.
    const h = header(accepted({ hasActed: false }));
    expect(readServerConsent(h)).toBeNull();
  });

  it("returns null for a corrupt percent-encoded value instead of throwing", () => {
    expect(() => readServerConsent("cookieyes-consent=%E0%A4%A")).not.toThrow();
    expect(readServerConsent("cookieyes-consent=%E0%A4%A")).toBeNull();
  });

  it("returns null for a value that carries no recognisable fields", () => {
    expect(readServerConsent("cookieyes-consent=garbage")).toBeNull();
  });

  it("returns null for a non-string header", () => {
    expect(readServerConsent(undefined as unknown as string)).toBeNull();
  });
});

describe("readServerConsent: a stored decision", () => {
  it("returns the snapshot for a returning visitor who accepted", () => {
    const snap = readServerConsent(header(accepted()), { regulation: "GDPR" });
    expect(snap).not.toBeNull();
    expect(snap?.hasActed).toBe(true);
    expect(snap?.categories.analytics).toBe(true);
    expect(snap?.categories.advertisement).toBe(false);
    expect(snap?.consentId).toBe("test-consent-id");
    expect(snap?.lastRenewed).toBe(1_700_000_000_000);
  });

  it("returns the snapshot for a visitor who rejected everything optional", () => {
    const snap = readServerConsent(
      header(
        accepted({
          categories: {
            necessary: true,
            functional: false,
            analytics: false,
            performance: false,
            advertisement: false,
          },
        }),
      ),
    );
    expect(snap?.hasActed).toBe(true);
    expect(snap?.categories.necessary).toBe(true);
    expect(snap?.categories.analytics).toBe(false);
  });

  it("finds the cookie among others in the header", () => {
    const h = header(accepted(), ["session=abc", "_ga=GA1.1.123"]);
    expect(readServerConsent(h)?.hasActed).toBe(true);
  });

  it("always grants required categories, whatever the cookie says", () => {
    const h = header(
      accepted({
        categories: {
          necessary: false,
          functional: false,
          analytics: false,
          performance: false,
          advertisement: false,
        },
      }),
    );
    expect(readServerConsent(h)?.categories.necessary).toBe(true);
  });
});

describe("readServerConsent: taxonomy changes are treated as stale", () => {
  const custom = [{ id: "essential", required: true }, { id: "marketing" }];

  it("returns null when the cookie was written against a different taxonomy", () => {
    // Stored under the built-in five, now reading with a custom taxonomy: the
    // client re-requests consent here, so the server must agree and show the
    // banner. Disagreeing is exactly what makes a banner flash.
    const h = header(accepted());
    expect(readServerConsent(h, { categories: custom })).toBeNull();
  });

  it("honours a matching custom taxonomy", () => {
    const resolved = resolveCategories(custom);
    const h = header(
      accepted({
        categories: { essential: true, marketing: true },
        taxonomyHash: resolved.taxonomyHash,
      }),
    );
    const snap = readServerConsent(h, { categories: custom });
    expect(snap?.hasActed).toBe(true);
    expect(Object.keys(snap?.categories ?? {}).sort()).toEqual(["essential", "marketing"]);
  });

  it("honours a legacy cookie with no taxonomy stamp on the default taxonomy", () => {
    // Upgrade safety: visitors who consented before the stamp existed must not
    // be re-prompted. Mirrors createConsentManager's rule exactly.
    const h = header(accepted({ taxonomyHash: undefined }));
    expect(readServerConsent(h)?.hasActed).toBe(true);
  });

  it("does not honour an unstamped cookie against a custom taxonomy", () => {
    const h = header(accepted({ taxonomyHash: undefined }));
    expect(readServerConsent(h, { categories: custom })).toBeNull();
  });

  it("stamps the returned snapshot with the current taxonomy", () => {
    const resolved = resolveCategories();
    const snap = readServerConsent(header(accepted({ taxonomyHash: undefined })));
    expect(snap?.taxonomyHash).toBe(resolved.taxonomyHash);
  });
});

describe("readServerConsent: is genuinely server-safe", () => {
  it("runs with no document and no window present", () => {
    expect(typeof document).toBe("undefined");
    expect(typeof window).toBe("undefined");
    expect(readServerConsent(header(accepted()))?.hasActed).toBe(true);
  });
});
