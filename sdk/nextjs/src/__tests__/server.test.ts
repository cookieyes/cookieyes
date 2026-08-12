import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `getServerConsent` is the Next.js wrapper around core's `readServerConsent`:
 * its only job is turning the App Router's cookie store into a `Cookie` header
 * string. `next/headers` needs a real request context, so it is mocked here —
 * the cookie-parsing behaviour itself is covered in core's
 * `server-consent.test.ts`.
 */

const cookieStore = { entries: [] as { name: string; value: string }[] };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => cookieStore.entries,
  }),
}));

const CONSENT = encodeURIComponent(
  [
    "consentid:abc",
    "consent:yes",
    "action:yes",
    "necessary:yes",
    "functional:yes",
    "analytics:yes",
    "performance:no",
    "advertisement:no",
    "lastRenewedDate:1700000000000",
  ].join(","),
);

beforeEach(() => {
  cookieStore.entries = [];
});

describe("getServerConsent", () => {
  it("returns null when the request carries no cookies", async () => {
    const { getServerConsent } = await import("../server.js");
    await expect(getServerConsent()).resolves.toBeNull();
  });

  it("returns null when the consent cookie is absent", async () => {
    cookieStore.entries = [{ name: "session", value: "abc" }];
    const { getServerConsent } = await import("../server.js");
    await expect(getServerConsent()).resolves.toBeNull();
  });

  it("returns the stored decision for a returning visitor", async () => {
    cookieStore.entries = [{ name: "cookieyes-consent", value: CONSENT }];
    const { getServerConsent } = await import("../server.js");
    const snap = await getServerConsent({ regulation: "GDPR" });
    expect(snap).not.toBeNull();
    expect(snap?.hasActed).toBe(true);
    expect(snap?.categories.analytics).toBe(true);
    expect(snap?.categories.advertisement).toBe(false);
  });

  it("finds the consent cookie among several others", async () => {
    cookieStore.entries = [
      { name: "session", value: "abc" },
      { name: "cookieyes-consent", value: CONSENT },
      { name: "_ga", value: "GA1.1.123" },
    ];
    const { getServerConsent } = await import("../server.js");
    expect((await getServerConsent())?.hasActed).toBe(true);
  });

  it("passes the taxonomy through, so a mismatch re-requests consent", async () => {
    cookieStore.entries = [{ name: "cookieyes-consent", value: CONSENT }];
    const { getServerConsent } = await import("../server.js");
    const snap = await getServerConsent({
      categories: [{ id: "essential", required: true }, { id: "marketing" }],
    });
    // Stored against the built-in five, read against a custom taxonomy → stale.
    expect(snap).toBeNull();
  });

  it("works with no options at all", async () => {
    cookieStore.entries = [{ name: "cookieyes-consent", value: CONSENT }];
    const { getServerConsent } = await import("../server.js");
    await expect(getServerConsent()).resolves.not.toBeNull();
  });
});
