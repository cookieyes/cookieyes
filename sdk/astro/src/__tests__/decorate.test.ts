import { defaultTranslations } from "@cookieyes/core";
import { banner, preferences, renderToString } from "@cookieyes/ui";
import { describe, expect, it } from "vitest";
import { _decorate } from "../decorate.js";

const BANNER = banner({ translations: defaultTranslations, regulation: "GDPR", titleId: "t" });

describe("_decorate", () => {
  it("adds each part's classes to the elements with that data-cy-part", () => {
    const html = renderToString(
      _decorate("banner", BANNER, {
        banner: { acceptAll: "a b", root: "card", nope: "zz-unknown" },
      }),
    );
    expect(html).toContain('class="cy-btn cy-btn-primary a b" data-cy-part="accept-all"');
    expect(html).toContain('class="cy-banner card"');
    expect(html).not.toContain("zz-unknown");
  });

  it("joins two keys that name the same part", () => {
    const node = { tag: "div", attrs: { "data-cy-part": "recall" } };
    expect(_decorate("recall", node, { recall: { root: "one" } }).attrs?.class).toBe("one");
  });

  it("leaves a surface without classNames as it is", () => {
    expect(_decorate("banner", BANNER, { preferences: { save: "s" } })).toBe(BANNER);
  });

  it("uses the dialog's part names for the preferences", () => {
    const node = preferences({ translations: defaultTranslations, titleId: "p", categories: [] });
    const html = renderToString(_decorate("preferences", node, { preferences: { save: "mine" } }));
    expect(html).toMatch(/class="[^"]*mine" data-cy-part="save"/);
  });
});
