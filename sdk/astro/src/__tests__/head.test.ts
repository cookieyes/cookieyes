import { describe, expect, it } from "vitest";
import { _headMarkup, _insertHead, _insertHeadStream, _readNonce } from "../head.js";

const PARTS = { scripts: ["a()", "b()"], styles: ["x{}", "y{}"], href: '/c.css?v="1"' };

async function streamed(chunks: string[], markup: string): Promise<string> {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(_insertHeadStream(body, markup)).text();
}

describe("_headMarkup", () => {
  it("writes the scripts, the styles and the deferred stylesheet, in that order", () => {
    expect(_headMarkup(PARTS, {})).toBe(
      "<script>a()</script><script>b()</script><style>x{}</style><style>y{}</style>" +
        '<link rel="stylesheet" href="/c.css?v=&quot;1&quot;" media="print" data-cy-full>',
    );
  });

  it("writes each directive's nonce on its own tags, escaped", () => {
    const html = _headMarkup(PARTS, { script: 'n"1', style: "s1" });
    expect(html).toContain('<script nonce="n&quot;1">a()</script>');
    expect(html).toContain('<style nonce="s1">x{}</style>');
    expect(html).toContain('data-cy-full nonce="s1">');
  });
});

describe("_readNonce", () => {
  it("reads the nonce of the directive asked for", () => {
    const policy = "default-src 'self'; script-src 'self' 'nonce-abc'; style-src 'nonce-def'";
    expect(_readNonce(policy, "script")).toBe("abc");
    expect(_readNonce(policy, "style")).toBe("def");
  });

  it("prefers the -elem directive, then the base one, then default-src, as a browser does", () => {
    const all = "default-src 'nonce-d'; script-src 'nonce-s'; script-src-elem 'nonce-e'";
    expect(_readNonce(all, "script")).toBe("e");
    // A directive that is present decides, even without a nonce: no fallback past it.
    expect(_readNonce("script-src-elem 'self'; script-src 'nonce-s'", "script")).toBeUndefined();
    expect(_readNonce("default-src 'nonce-d'; style-src-elem 'nonce-t'", "style")).toBe("t");
    expect(_readNonce("default-src 'nonce-d'", "style")).toBe("d");
    expect(_readNonce("script-src 'nonce-a'; script-src 'nonce-b'", "script")).toBe("a");
  });

  it("finds none without a policy or a nonce source", () => {
    expect(_readNonce(null, "script")).toBeUndefined();
    expect(_readNonce("script-src 'self'", "script")).toBeUndefined();
  });
});

describe("_insertHead", () => {
  it("goes right after the charset tag", () => {
    expect(
      _insertHead('<html><head><title>t</title><meta charset="utf-8"></head>', "M", false),
    ).toBe('<html><head><title>t</title><meta charset="utf-8">M</head>');
  });

  it("waits for more while the head may still hold a charset tag", () => {
    expect(_insertHead("<html><head><title>t</title>", "M", false)).toBeUndefined();
  });

  it("goes after <head> once the head is done without a charset tag", () => {
    expect(_insertHead('<head lang="x"><title>t</title></head><body>', "M", false)).toBe(
      '<head lang="x">M<title>t</title></head><body>',
    );
    expect(_insertHead("<head><title>t</title>", "M", true)).toBe("<head>M<title>t</title>");
  });

  it("leaves HTML with no head untouched, such as a server island", () => {
    expect(_insertHead("<div>island</div>", "M", true)).toBe("<div>island</div>");
  });
});

describe("_insertHeadStream", () => {
  it("places the markup when the charset tag is split across chunks", async () => {
    const out = await streamed(["<html><head><meta char", 'set="utf-8">', "<body>é</body>"], "M");
    expect(out).toBe('<html><head><meta charset="utf-8">M<body>é</body>');
  });

  it("keeps a character whose bytes are split across chunks after the insertion", async () => {
    const bytes = new TextEncoder().encode('<head><meta charset="utf-8"></head><p>é</p>');
    const split = bytes.length - 6;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, split));
        controller.enqueue(bytes.slice(split));
        controller.close();
      },
    });
    expect(await new Response(_insertHeadStream(body, "M")).text()).toBe(
      '<head><meta charset="utf-8">M</head><p>é</p>',
    );
  });

  it("passes a body with no head through unchanged", async () => {
    expect(await streamed(["<div>", "island</div>"], "M")).toBe("<div>island</div>");
  });

  it("places the markup after <head> at the end of a head-only stream", async () => {
    expect(await streamed(["<head>", "<title>t</title>"], "M")).toBe("<head>M<title>t</title>");
  });

  it("sends the start of the page before the rest of the body has arrived", async () => {
    const encoder = new TextEncoder();
    let finish: (() => void) | undefined;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('<head><meta charset="utf-8"></head>'));
        finish = () => {
          controller.enqueue(encoder.encode("<body></body>"));
          controller.close();
        };
      },
    });
    const reader = _insertHeadStream(body, "M").getReader();
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toBe('<head><meta charset="utf-8">M</head>');
    finish?.();
    const second = await reader.read();
    expect(new TextDecoder().decode(second.value)).toBe("<body></body>");
  });
});
