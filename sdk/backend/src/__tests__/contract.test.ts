import { type ConsentPayload, createConsentManager } from "@cookieyes/core";
import { describe, expect, it } from "vitest";
import { PAYLOAD_FIELDS, toStoredRecord, validatePayload } from "../contract.js";

/** A record exactly as the SDK in this repository sends it. */
async function realPayload(): Promise<ConsentPayload> {
  const sent: ConsentPayload[] = [];
  const manager = createConsentManager({
    regulation: "GDPR",
    region: "US-CA",
    backend: { persist: (payload) => void sent.push(payload) },
  });
  manager.acceptAll();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const [payload] = sent;
  if (!payload) throw new Error("the SDK sent no record");
  return payload;
}

function valid(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    recordId: "abc.1.x",
    consentId: "abc",
    categories: { necessary: true, analytics: false },
    regulation: "GDPR",
    domain: "shop.example",
    decidedAt: "2026-03-01T10:00:00Z",
    taxonomyHash: "h1",
    action: "accept_selected",
    source: "preferences",
    ...overrides,
  };
}

const refused = (body: unknown) => {
  const result = validatePayload(body);
  return result.ok ? null : result.error;
};

describe("PAYLOAD_FIELDS", () => {
  it("lists exactly the fields the SDK sends, so the contract and the SDK cannot drift", async () => {
    const payload = await realPayload();
    expect(Object.keys(payload).sort()).toEqual(PAYLOAD_FIELDS.map((f) => f.name).sort());
  });

  it("accepts the record the SDK sends", async () => {
    const payload = await realPayload();
    const result = validatePayload(JSON.parse(JSON.stringify(payload)));
    expect(result).toEqual({ ok: true, value: payload });
  });
});

describe("validatePayload", () => {
  it("drops fields it does not know instead of refusing them", () => {
    const result = validatePayload(valid({ fromANewerSdk: 1 }));
    expect(result.ok && "fromANewerSdk" in result.value).toBe(false);
  });

  it("writes decidedAt in one canonical form", () => {
    const result = validatePayload(valid({ decidedAt: "2026-03-01T12:00:00+02:00" }));
    expect(result.ok && result.value.decidedAt).toBe("2026-03-01T10:00:00.000Z");
  });

  it("asks old SDKs without a recordId to upgrade", () => {
    const { recordId: _omitted, ...rest } = valid();
    expect(refused(rest)?.code).toBe("record_id_required");
  });

  it.each([
    ["a body that is not an object", [1]],
    ["null", null],
    ["a missing required field", valid({ domain: undefined })],
    ["an empty string", valid({ taxonomyHash: "" })],
    ["a value outside the list", valid({ action: "maybe" })],
    ["a date that is not a date", valid({ decidedAt: "soon" })],
    ["a field over its length", valid({ recordId: "x".repeat(257) })],
    ["a consent id with a space", valid({ consentId: "a b" })],
    ["a gpc that is not a boolean", valid({ gpc: "yes" })],
    ["categories that are an array", valid({ categories: [true] })],
    ["no categories at all", valid({ categories: {} })],
    ["a category id with a comma", valid({ categories: { "a,b": true } })],
    ["a category that is not a boolean", valid({ categories: { analytics: 1 } })],
    [
      "too many categories",
      valid({
        categories: Object.fromEntries(Array.from({ length: 65 }, (_, i) => [`c${i}`, true])),
      }),
    ],
  ])("refuses %s", (_name, body) => {
    expect(refused(body)?.code).toBe("invalid_payload");
  });

  it("names the field that is wrong", () => {
    expect(refused(valid({ regulation: "LGPD" }))?.message).toBe(
      "regulation must be one of GDPR, CCPA, DEFAULT.",
    );
  });
});

describe("toStoredRecord", () => {
  it("splits categories into granted and denied, in the order the SDK listed them", () => {
    const result = validatePayload(
      valid({ categories: { necessary: true, ads: false, analytics: true } }),
    );
    if (!result.ok) throw new Error("expected a valid payload");
    const stored = toStoredRecord(result.value, new Date("2026-03-02T00:00:00Z"), null);
    expect(stored).toMatchObject({
      granted: ["necessary", "analytics"],
      denied: ["ads"],
      receivedAt: "2026-03-02T00:00:00.000Z",
      region: null,
      sdkVersion: null,
      gpc: null,
      ip: null,
    });
  });
});
