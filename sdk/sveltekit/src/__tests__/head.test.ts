// @vitest-environment node
import { describe, expect, it } from "vitest";
import { _consentModeText, _hasHeadAnchor, _headMarkup, _insertHead, _readNonce } from "../head.js";
import { CRITICAL_CSS } from "../styles.js";

describe("_headMarkup", () => {
  const href = "/cookieyes/styles.css?v=1";

  it("writes the critical CSS, then the deferred stylesheet link, with no script by default", () => {
    expect(_headMarkup(undefined, href, undefined)).toBe(
      `<style>${CRITICAL_CSS}</style><link rel="stylesheet" href="${href}" media="print" data-cy-full>`,
    );
  });

  it("puts the Consent Mode script before the style and the link", () => {
    const markup = _headMarkup("window.dataLayer=[]", href, undefined);
    expect(markup.startsWith("<script>window.dataLayer=[]</script><style>")).toBe(true);
    expect(markup.indexOf("<script")).toBeLessThan(markup.indexOf("<link"));
  });

  it("copies a nonce onto the script, never onto the style", () => {
    const markup = _headMarkup("x", href, "abc123");
    expect(markup).toContain('<script nonce="abc123">x</script>');
    expect(markup).toContain(`<style>${CRITICAL_CSS}</style>`);
    expect(markup.match(/nonce=/g)).toHaveLength(1);
  });

  it("escapes the link's URL and the nonce", () => {
    expect(_headMarkup(undefined, '/a"b<c&d', undefined)).toContain('href="/a&quot;b&lt;c&amp;d"');
    expect(_headMarkup("x", href, 'a"b')).toContain('nonce="a&quot;b"');
  });
});

describe("_consentModeText", () => {
  it("is undefined when Consent Mode is not asked for", () => {
    expect(_consentModeText(undefined)).toBeUndefined();
    expect(_consentModeText(false)).toBeUndefined();
  });

  it("builds Google's deny-by-default default for true and for options", () => {
    expect(_consentModeText(true)).toContain("dataLayer");
    expect(_consentModeText({ waitForUpdate: 123 })).toContain("123");
  });
});

describe("_readNonce", () => {
  it("reads the nonce SvelteKit put on its own script", () => {
    expect(_readNonce('<body><script nonce="Zm9vYmFy==">boot()</script>')).toBe("Zm9vYmFy==");
  });

  it("is undefined when the page has no nonce, or an empty one", () => {
    expect(_readNonce("<body><script>boot()</script>")).toBeUndefined();
    expect(_readNonce('<script nonce="">x</script>')).toBeUndefined();
  });

  it("does not read a nonce from a style tag, which SvelteKit does not admit by nonce", () => {
    expect(_readNonce('<style nonce="abc">x</style>')).toBeUndefined();
  });
});

describe("_insertHead", () => {
  it("puts the markup right after the charset, ahead of every other tag", () => {
    const html =
      '<head><meta charset="utf-8" /><meta name="viewport" content="x"><script src="gtag.js"></script></head>';
    expect(_insertHead(html, "<style>x</style>")).toBe(
      '<head><meta charset="utf-8" /><style>x</style><meta name="viewport" content="x"><script src="gtag.js"></script></head>',
    );
  });

  it("falls back to right after the opening head tag when there is no charset", () => {
    expect(_insertHead('<head lang="en"><title>P</title></head>', "<b>")).toBe(
      '<head lang="en"><b><title>P</title></head>',
    );
  });

  it("falls back to the start when there is neither", () => {
    expect(_insertHead("<title>P</title>", "<b>")).toBe("<b><title>P</title>");
  });

  it("is not fooled by a tag that merely starts with head", () => {
    expect(_insertHead("<header>x</header>", "<b>")).toBe("<b><header>x</header>");
  });
});

describe("_hasHeadAnchor", () => {
  it("is true for a chunk with a charset tag or a head tag, false otherwise", () => {
    expect(_hasHeadAnchor('<meta charset="utf-8">')).toBe(true);
    expect(_hasHeadAnchor("<head>")).toBe(true);
    expect(_hasHeadAnchor("<body>")).toBe(false);
  });
});
