import { afterEach, describe, expect, it } from "vitest";
import { createConsentTest } from "../harness.js";
import { resetConsentTestState } from "../reset.js";

afterEach(resetConsentTestState);

const BUILT_IN = ["necessary", "functional", "analytics", "performance", "advertisement"];

describe("a safe fake with no webpage, cookies, or network", () => {
  it("builds a working consent environment with no document in the environment", () => {
    // The suite runs under `environment: "node"`. If this assertion ever fails,
    // something is quietly pulling in a DOM and the headless promise is broken.
    expect(typeof globalThis.document).toBe("undefined");

    const consent = createConsentTest({ initialConsent: { analytics: true } });

    expect(consent.has("analytics")).toBe(true);
    expect(consent.has("advertisement")).toBe(false);
  });

  it("exposes the taxonomy actually in effect", () => {
    const consent = createConsentTest();
    expect([...consent.categories]).toEqual(BUILT_IN);
  });

  it("hands back the real core objects as an escape hatch", () => {
    const consent = createConsentTest();
    expect(typeof consent.manager.acceptAll).toBe("function");
    expect(typeof consent.store.getState).toBe("function");
    expect(consent.store.categories.ids).toEqual(BUILT_IN);
  });

  it("throws a descriptive error naming the valid ids on an unknown category", () => {
    const consent = createConsentTest();
    expect(() => consent.has("analytcs" as "analytics")).toThrow(
      /Unknown consent category "analytcs"/,
    );
    expect(() => consent.has("analytcs" as "analytics")).toThrow(
      /necessary, functional, analytics/,
    );
  });
});

describe("a brand-new visitor versus a returning one", () => {
  it("starts unacted with only the required category on when nothing is seeded", () => {
    const consent = createConsentTest();
    const snapshot = consent.snapshot();

    expect(snapshot.hasActed).toBe(false);
    expect(snapshot.committed).toEqual({
      necessary: true,
      functional: false,
      analytics: false,
      performance: false,
      advertisement: false,
    });
  });

  it("starts acted when consent is seeded — a returning visitor", () => {
    const consent = createConsentTest({ initialConsent: { analytics: true } });
    expect(consent.snapshot().hasActed).toBe(true);
  });

  it("treats CCPA as opt-out, exactly as core does", () => {
    const consent = createConsentTest({ regulation: "CCPA" });
    expect(consent.has("advertisement")).toBe(true);
    expect(consent.snapshot().regulation).toBe("CCPA");
  });
});

describe("changing a visitor's mind mid-test", () => {
  it("grants and denies after the run has already started", () => {
    const consent = createConsentTest();

    consent.grant("analytics");
    expect(consent.has("analytics")).toBe(true);

    consent.deny("analytics");
    expect(consent.has("analytics")).toBe(false);
  });

  it("reports current state at any point, splitting committed from live", () => {
    const consent = createConsentTest();

    consent.toggle("analytics", true);
    const mid = consent.snapshot();
    expect(mid.live.analytics).toBe(true);
    expect(mid.committed.analytics).toBe(false);
    expect(consent.has("analytics")).toBe(false);

    consent.save();
    expect(consent.snapshot().committed.analytics).toBe(true);
    expect(consent.has("analytics")).toBe(true);
  });

  it("keeps required categories on — production's rule, not a special case here", () => {
    const consent = createConsentTest();

    consent.deny("necessary");
    expect(consent.has("necessary")).toBe(true);

    consent.toggle("necessary", false);
    expect(consent.snapshot().live.necessary).toBe(true);
  });

  it("accepts everything and rejects everything", () => {
    const consent = createConsentTest();

    consent.acceptAll();
    expect(consent.snapshot().committed).toEqual({
      necessary: true,
      functional: true,
      analytics: true,
      performance: true,
      advertisement: true,
    });

    consent.rejectAll();
    expect(consent.snapshot().committed.analytics).toBe(false);
  });

  it("withdraws everything at once, leaving required categories on", () => {
    const consent = createConsentTest({ initialConsent: { analytics: true, advertisement: true } });

    consent.withdrawAll();

    expect(consent.snapshot().committed).toEqual({
      necessary: true,
      functional: false,
      analytics: false,
      performance: false,
      advertisement: false,
    });
  });

  it("accepts only a named subset", () => {
    const consent = createConsentTest();

    consent.acceptOnly(["analytics", "functional"]);

    expect(consent.has("analytics")).toBe(true);
    expect(consent.has("functional")).toBe(true);
    expect(consent.has("advertisement")).toBe(false);
  });

  it("rejects an unknown id in acceptOnly before changing anything", () => {
    const consent = createConsentTest();
    expect(() => consent.acceptOnly(["analytcs" as "analytics"])).toThrow(
      /Unknown consent category/,
    );
    expect(consent.snapshot().hasActed).toBe(false);
  });

  it("rejects an unknown id on grant, deny, set and toggle", () => {
    const consent = createConsentTest();
    const bad = "advertisment" as "advertisement";

    expect(() => consent.grant(bad)).toThrow(/Unknown consent category/);
    expect(() => consent.deny(bad)).toThrow(/Unknown consent category/);
    expect(() => consent.set(bad, true)).toThrow(/Unknown consent category/);
    expect(() => consent.toggle(bad, true)).toThrow(/Unknown consent category/);
  });

  it("sets a value explicitly with set()", () => {
    const consent = createConsentTest();
    consent.set("performance", true);
    expect(consent.has("performance")).toBe(true);
    consent.set("performance", false);
    expect(consent.has("performance")).toBe(false);
  });
});

describe("resetVisitor and teardown", () => {
  it("returns to a brand-new visitor while keeping the harness usable", () => {
    const consent = createConsentTest({ initialConsent: { analytics: true } });
    expect(consent.snapshot().hasActed).toBe(true);

    consent.resetVisitor();

    expect(consent.snapshot().hasActed).toBe(false);
    expect(consent.has("analytics")).toBe(false);
    // Still live: the harness survives a visitor reset.
    consent.grant("analytics");
    expect(consent.has("analytics")).toBe(true);
  });

  it("removes the document jar on teardown", () => {
    const consent = createConsentTest();
    expect(typeof globalThis.document).toBe("object");

    consent.teardown();

    expect(typeof globalThis.document).toBe("undefined");
  });
});

describe("custom taxonomies", () => {
  it("uses the declared taxonomy and forces its required id on", () => {
    const consent = createConsentTest({
      categories: [{ id: "essential", required: true }, { id: "marketing" }, { id: "insights" }],
      initialConsent: { marketing: true },
    });

    expect([...consent.categories]).toEqual(["essential", "marketing", "insights"]);
    expect(consent.has("essential")).toBe(true);
    expect(consent.has("marketing")).toBe(true);
    expect(consent.has("insights")).toBe(false);
  });

  it("rejects a built-in id that is not part of the declared taxonomy", () => {
    const consent = createConsentTest({
      categories: [{ id: "essential", required: true }, { id: "marketing" }],
    });

    expect(() => consent.has("analytics" as "marketing")).toThrow(
      /Valid categories for this harness: essential, marketing/,
    );
  });
});
