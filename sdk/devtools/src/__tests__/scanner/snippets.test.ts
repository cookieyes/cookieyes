import { describe, expect, it } from "vitest";
import { classify } from "../../scanner/classify.js";
import type { Observation } from "../../scanner/collector.js";
import { snippetFor } from "../../scanner/snippets.js";
import { createVendorLookup } from "../../scanner/vendors.js";

function snippet(o: Omit<Observation, "key" | "firstSeen" | "count" | "present">) {
  const [f] = classify(
    [{ key: `${o.kind}:${o.label}`, firstSeen: 0, count: 1, present: true, ...o }],
    [],
    {},
    createVendorLookup(),
  );
  return f ? snippetFor(f) : undefined;
}

describe("snippetFor", () => {
  it("suggests the @cookieyes/scripts preset when one manages the vendor", () => {
    const s = snippet({
      kind: "script",
      label: "x",
      url: "https://connect.facebook.net/en_US/fbevents.js",
    });
    expect(s?.code).toContain('import { metaPixel } from "@cookieyes/scripts";');
    expect(s?.code).toContain("metaPixel({ pixelId:");
  });

  it("suggests customScript for a script with no preset", () => {
    const url = "https://cdn.amplitude.com/libs/amplitude-8.min.js";
    const s = snippet({ kind: "script", label: url, url });
    expect(s?.code).toContain("customScript({");
    expect(s?.code).toContain(`src: "${url}"`);
    expect(s?.code).toContain('category: "analytics"');
  });

  it("suggests GatedFrame for an iframe", () => {
    const url = "https://player.vimeo.com/video/1";
    expect(snippet({ kind: "iframe", label: url, url })?.code).toContain(
      `<GatedFrame src="${url}" category="analytics" />`,
    );
  });

  it("suggests a network-blocker rule for requests", () => {
    const s = snippet({
      kind: "request",
      label: "api.amplitude.com/httpapi",
      url: "https://api.amplitude.com/httpapi",
    });
    expect(s?.code).toContain('domain: "api.amplitude.com", pathIncludes: "/httpapi"');
  });

  it("offers nothing for cookies or necessary vendors", () => {
    expect(snippet({ kind: "cookie", label: "_hjSession_1" })).toBeUndefined();
    expect(
      snippet({ kind: "script", label: "s", url: "https://js.stripe.com/v3/" }),
    ).toBeUndefined();
  });
});
