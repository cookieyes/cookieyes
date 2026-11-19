import { beforeEach, describe, expect, it } from "vitest";
import headPlugin, { _headMarkup, _insertHead } from "../runtime/server/head.js";
import { runtimeConfig } from "./stubs/imports.js";

type Hook = (html: { head: string[] }) => void;

function install(): Hook | undefined {
  let registered: Hook | undefined;
  (headPlugin as unknown as (app: unknown) => void)({
    hooks: { hook: (_name: string, fn: Hook) => (registered = fn) },
  });
  return registered;
}

beforeEach(() => {
  delete runtimeConfig.cookieyesHead;
  delete runtimeConfig.app;
});

describe("_headMarkup", () => {
  it("adds the deferred stylesheet link under the run-time base URL", () => {
    const head = { markup: "<style>x</style>", stylesPath: "/cookieyes/styles.css?v=1" };
    expect(_headMarkup(head, "/")).toBe(
      '<style>x</style><link rel="stylesheet" href="/cookieyes/styles.css?v=1" media="print" data-cy-full>',
    );
    expect(_headMarkup(head, "/shop/")).toContain('href="/shop/cookieyes/styles.css?v=1"');
  });

  it("escapes the link's URL", () => {
    expect(_headMarkup({ markup: "", stylesPath: '/a"b<c&d' }, "/")).toContain(
      'href="/a&quot;b&lt;c&amp;d"',
    );
  });
});

describe("_insertHead", () => {
  it("puts the markup right after the charset, ahead of every other tag", () => {
    const head = [
      '<meta charset="utf-8"><meta name="viewport" content="x"><script src="gtag.js"></script>',
    ];
    _insertHead(head, "<style>x</style>");
    expect(head[0]).toBe(
      '<meta charset="utf-8"><style>x</style><meta name="viewport" content="x"><script src="gtag.js"></script>',
    );
  });

  it("puts it first when the page has no charset tag", () => {
    const head = ["<title>Page</title>"];
    _insertHead(head, "<style>x</style>");
    expect(head).toEqual(["<style>x</style>", "<title>Page</title>"]);
  });
});

describe("the head Nitro plugin", () => {
  it("writes the module's markup into every rendered head, under the run-time base", () => {
    runtimeConfig.cookieyesHead = { markup: "<style>x</style>", stylesPath: "/s.css" };
    runtimeConfig.app = { baseURL: "/app/" };
    const html = { head: ['<meta charset="utf-8"><title>Page</title>'] };
    install()?.(html);
    expect(html.head[0]).toContain(
      '<meta charset="utf-8"><style>x</style><link rel="stylesheet" href="/app/s.css"',
    );
  });

  it("registers nothing when the module wrote no markup", () => {
    expect(install()).toBeUndefined();
  });
});
