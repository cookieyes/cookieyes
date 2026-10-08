import { describe, expect, it } from "vitest";
import {
  advanceTimeline,
  type ConsentTimeline,
  classify,
  type ManagedResource,
} from "../../scanner/classify.js";
import type { Observation } from "../../scanner/collector.js";
import { createVendorLookup } from "../../scanner/vendors.js";

const vendors = createVendorLookup();

function obs(partial: Partial<Observation> & Pick<Observation, "kind" | "label">): Observation {
  return {
    key: `${partial.kind}:${partial.label}`,
    firstSeen: 1000,
    count: 1,
    present: true,
    ...partial,
  };
}

const NONE: ConsentTimeline = {};
const grantedAt = (at: number): ConsentTimeline => ({
  analytics: [[at, undefined]],
});

function one(o: Observation, managed: ManagedResource[] = [], timeline = NONE) {
  const [finding] = classify([o], managed, timeline, vendors);
  if (!finding) throw new Error("no finding");
  return finding;
}

const hotjar = obs({
  kind: "script",
  label: "https://static.hotjar.com/c/hotjar-1.js",
  url: "https://static.hotjar.com/c/hotjar-1.js?sv=6",
});

describe("classify", () => {
  it("marks a known vendor the SDK doesn't control as unmanaged, with its usual category", () => {
    const f = one(hotjar);
    expect(f.status).toBe("unmanaged");
    expect(f.vendor?.name).toBe("Hotjar");
    expect(f.category).toBe("analytics");
  });

  it("flags an unmanaged vendor seen while its category was never granted", () => {
    expect(one(hotjar).preConsent).toBe(true);
  });

  it("flags one seen before its category was granted, and not one seen after", () => {
    expect(one(hotjar, [], grantedAt(2000)).preConsent).toBe(true);
    expect(one(hotjar, [], grantedAt(500)).preConsent).toBe(false);
  });

  it("treats a script whose URL the SDK registered as managed, with the registered category", () => {
    const f = one(hotjar, [
      {
        id: "hj",
        src: "https://static.hotjar.com/c/hotjar-1.js",
        category: "performance",
        via: "registerScript",
      },
    ]);
    expect(f.status).toBe("managed");
    expect(f.managedBy).toBe("registerScript");
    expect(f.category).toBe("performance");
  });

  it("treats requests and cookies from a managed vendor as managed too", () => {
    const managed: ManagedResource[] = [
      {
        id: "cky-gtag",
        src: "https://www.googletagmanager.com/gtag/js?id=G-1",
        via: "integration",
      },
      { id: "ga", src: "https://www.google-analytics.com/analytics.js", via: "integration" },
    ];
    const beacon = obs({
      kind: "request",
      label: "region1.google-analytics.com",
      url: "https://region1.google-analytics.com/g/collect",
    });
    expect(one(beacon, managed).status).toBe("managed");
    expect(one(obs({ kind: "cookie", label: "_ga" }), managed).status).toBe("managed");
  });

  it("treats an iframe held by blockIframes as managed, and never flags it while held", () => {
    const f = one(
      obs({
        kind: "iframe",
        label: "https://www.youtube.com/embed/x",
        url: "https://www.youtube.com/embed/x",
        blockedIframeCategory: "marketing",
        held: true,
      }),
    );
    expect(f.status).toBe("managed");
    expect(f.managedBy).toBe("blockIframes");
    expect(f.category).toBe("marketing");
    expect(f.preConsent).toBe(false);
  });

  it("never flags strictly necessary or cookieless vendors", () => {
    const stripe = one(
      obs({ kind: "script", label: "https://js.stripe.com/v3", url: "https://js.stripe.com/v3/" }),
    );
    expect(stripe.status).toBe("necessary");
    expect(stripe.preConsent).toBe(false);
    const plausible = one(
      obs({
        kind: "script",
        label: "https://plausible.io/js/script.js",
        url: "https://plausible.io/js/script.js",
      }),
    );
    expect(plausible.preConsent).toBe(false);
  });

  it("leaves unknown hosts unclassified, with no category and no flag", () => {
    const f = one(
      obs({
        kind: "script",
        label: "https://cdn.example.org/a.js",
        url: "https://cdn.example.org/a.js",
      }),
    );
    expect(f.status).toBe("unclassified");
    expect(f.category).toBeUndefined();
    expect(f.preConsent).toBe(false);
  });

  it("flags a vendor cookie still present after its category was withdrawn", () => {
    const withdrawn: ConsentTimeline = { analytics: [[500, 700]] };
    const f = one(obs({ kind: "cookie", label: "_hjSession_1", firstSeen: 600 }), [], withdrawn);
    expect(f.afterWithdrawal).toBe(true);
    expect(f.preConsent).toBe(false);
  });

  it("stops flagging a cookie once it has been cleared", () => {
    const f = one(obs({ kind: "cookie", label: "_hjSession_1", present: false }));
    expect(f.preConsent).toBe(false);
    expect(f.afterWithdrawal).toBe(false);
  });
});

describe("classify under Google Consent Mode", () => {
  const gtag: ManagedResource[] = [
    { id: "cky-gtag", src: "https://www.googletagmanager.com/gtag/js?id=G-1", via: "integration" },
  ];

  it("treats the whole Google family as managed once gtag.js is", () => {
    const beacon = obs({
      kind: "request",
      label: "www.google-analytics.com",
      url: "https://www.google-analytics.com/g/collect",
    });
    const ads = obs({
      kind: "request",
      label: "googleads.g.doubleclick.net",
      url: "https://googleads.g.doubleclick.net/pagead/x",
    });
    expect(one(beacon, gtag).status).toBe("managed");
    expect(one(ads, gtag).status).toBe("managed");
  });

  it("doesn't flag a managed Google tag or its pings for loading before consent", () => {
    const script = obs({
      kind: "script",
      label: "x",
      url: "https://www.googletagmanager.com/gtag/js?id=G-1",
    });
    const f = one(script, gtag);
    expect(f.preConsent).toBe(false);
    expect(f.consentModeByDesign).toBe(true);
  });

  it("still flags Google cookies set before consent", () => {
    expect(one(obs({ kind: "cookie", label: "_ga" }), gtag).preConsent).toBe(true);
  });

  it("still checks a Google script the page hard-codes beside a managed gtag.js", () => {
    const hardCoded = obs({
      kind: "script",
      label: "x",
      url: "https://www.googleadservices.com/pagead/conversion.js",
    });
    const f = one(hardCoded, gtag);
    expect(f.consentModeByDesign).toBe(false);
    expect(f.preConsent).toBe(true);
  });

  it("still flags an unmanaged Google tag, which has no Consent Mode default", () => {
    const script = obs({
      kind: "script",
      label: "x",
      url: "https://www.googletagmanager.com/gtag/js?id=G-1",
    });
    expect(one(script).preConsent).toBe(true);
  });
});

describe("advanceTimeline", () => {
  it("opens a period on grant and closes it on withdrawal", () => {
    let t = advanceTimeline({}, { analytics: false }, 0);
    expect(t.analytics).toBeUndefined();
    t = advanceTimeline(t, { analytics: true }, 100);
    t = advanceTimeline(t, { analytics: true }, 150);
    t = advanceTimeline(t, { analytics: false }, 200);
    t = advanceTimeline(t, { analytics: true }, 300);
    expect(t.analytics).toEqual([
      [100, 200],
      [300, undefined],
    ]);
  });
});

describe("classify after a withdrawal", () => {
  const timeline: ConsentTimeline = { analytics: [[500, 700]] };

  it("flags a tracker that loads after consent was withdrawn", () => {
    const f = one({ ...hotjar, firstSeen: 800 }, [], timeline);
    expect(f.preConsent).toBe(true);
    expect(f.loadedAfterWithdrawal).toBe(true);
  });

  it("doesn't flag one that loaded while consent was granted", () => {
    const f = one({ ...hotjar, firstSeen: 600 }, [], timeline);
    expect(f.preConsent).toBe(false);
  });

  it("calls a load before any grant 'before consent', not after withdrawal", () => {
    const f = one({ ...hotjar, firstSeen: 100 }, [], timeline);
    expect(f.preConsent).toBe(true);
    expect(f.loadedAfterWithdrawal).toBe(false);
  });
});
