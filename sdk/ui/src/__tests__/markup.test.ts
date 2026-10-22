import { defaultTranslations } from "@cookieyes/core";
import { describe, expect, it } from "vitest";
import {
  banner,
  bannerAnnouncer,
  optOut,
  preferences,
  recallButton,
  reloadNotice,
} from "../markup/components.js";
import { renderToString } from "../markup/node.js";

// Runs in Node with no DOM: the markup has to render on a server.

describe("renderToString", () => {
  it("escapes text and attribute values, so a translation cannot become markup", () => {
    const html = renderToString({
      tag: "p",
      attrs: { title: `"><script>alert(1)</script>` },
      children: ["<img src=x onerror=alert(1)> & 'quotes'"],
    });
    expect(html).toBe(
      '<p title="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;">&lt;img src=x onerror=alert(1)&gt; &amp; &#39;quotes&#39;</p>',
    );
  });

  it("writes empty attributes bare, void elements without a closing tag, and checked state", () => {
    expect(
      renderToString({
        tag: "input",
        attrs: { type: "checkbox", disabled: "" },
        props: { checked: true },
      }),
    ).toBe('<input type="checkbox" disabled checked>');
  });

  it("renders a list of nodes in order", () => {
    expect(renderToString([{ tag: "b", children: ["1"] }, "2"])).toBe("<b>1</b>2");
  });
});

describe("banner", () => {
  const t = defaultTranslations;

  it("offers accept, reject and customise under GDPR", () => {
    const html = renderToString(banner({ translations: t, regulation: "GDPR", titleId: "cy-t" }));
    for (const part of ["customise", "reject-all", "accept-all", "close", "branding"]) {
      expect(html).toContain(`data-cy-part="${part}"`);
    }
    expect(html).not.toContain('data-cy-part="do-not-sell"');
    expect(html).toContain('aria-labelledby="cy-t"');
    expect(html).toContain('id="cy-t"');
  });

  it("offers only Do Not Sell under CCPA, with the CCPA description", () => {
    const html = renderToString(banner({ translations: t, regulation: "CCPA", titleId: "cy-t" }));
    expect(html).toContain('data-cy-part="do-not-sell"');
    expect(html).not.toContain('data-cy-part="accept-all"');
    expect(html).toContain("cy-banner-footer--ccpa");
  });

  it("puts the announcement text in the live region only when given", () => {
    expect(renderToString(bannerAnnouncer())).not.toContain(t.bannerTitle);
    expect(renderToString(bannerAnnouncer(t.bannerTitle))).toContain(t.bannerTitle);
  });
});

describe("preferences", () => {
  it("shows a switch for each optional category and a label for each required one", () => {
    const html = renderToString(
      preferences({
        translations: defaultTranslations,
        titleId: "cy-p",
        categories: [
          { id: "necessary", label: "Necessary", description: "", checked: true, required: true },
          { id: "analytics", label: "Analytics", description: "", checked: true, required: false },
          { id: "ads", label: "Ads", description: "", checked: false, required: false },
        ],
      }),
    );
    expect(html.match(/role="switch"/g)).toHaveLength(2);
    expect(html).toContain(defaultTranslations.alwaysActive);
    expect(html).toContain('data-cy-state="on"');
    expect(html).toContain('data-cy-state="off"');
  });
});

describe("optOut", () => {
  const base = {
    translations: defaultTranslations,
    titleId: "cy-o",
    checkboxId: "cy-o-box",
    optedOut: true,
  };

  it("shows the buttons until the visitor confirms", () => {
    const html = renderToString(optOut(base));
    expect(html).toContain('data-cy-part="confirm"');
    expect(html).not.toContain('role="status"');
    expect(html).toContain('for="cy-o-box"');
  });

  it("replaces the buttons with the confirmation and its countdown", () => {
    const html = renderToString(optOut({ ...base, confirmation: { secondsLeft: 4 } }));
    expect(html).not.toContain('data-cy-part="confirm"');
    expect(html).toContain('role="status"');
    expect(html).toContain('<span class="cy-optout-countdown">4</span>');
    expect(html).toContain("disabled");
  });
});

describe("reloadNotice and recallButton", () => {
  it("draw their parts", () => {
    expect(renderToString(reloadNotice(defaultTranslations))).toContain('role="alert"');
    expect(renderToString(recallButton(defaultTranslations))).toContain('data-cy-part="recall"');
  });
});
