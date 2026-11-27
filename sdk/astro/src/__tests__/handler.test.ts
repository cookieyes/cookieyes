import { afterEach, describe, expect, it, vi } from "vitest";
import { _createHandler } from "../handler.js";
import type { CookieYesLocals } from "../server-consent.js";

const HEAD = { scripts: ["s()"], styles: ["c{}"], href: "/cookieyes/styles.css?v=1" };
const CONFIG = { mode: "cookie-only", region: { map: { "US-CA": "CCPA" } } } as const;
const PAGE =
  '<!doctype html><html><head><meta charset="utf-8"><title>t</title></head><body></body></html>';

function html(body = PAGE, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    headers: { "content-type": "text/html", "content-length": "10", ...headers },
  });
}

function run(
  response: Response,
  {
    prerendered = false,
    request = new Request("https://example.com/"),
    during,
    dev = false,
  }: {
    prerendered?: boolean;
    request?: Request;
    during?: (locals: { cookieyes: CookieYesLocals }) => void;
    dev?: boolean;
  } = {},
) {
  const locals = {} as { cookieyes: CookieYesLocals };
  const handler = _createHandler({ config: CONFIG, head: HEAD, dev });
  const next = vi.fn(async () => {
    during?.(locals);
    return response;
  });
  return { locals, done: handler({ request, locals, isPrerendered: prerendered }, next) };
}

afterEach(() => vi.restoreAllMocks());

describe("the middleware", () => {
  it("writes the head tags after <meta charset> and drops the stale length", async () => {
    const out = await run(html()).done;
    const text = await out.text();
    expect(text).toContain('<meta charset="utf-8"><script>s()</script><style>c{}</style><link');
    expect(out.headers.get("content-length")).toBeNull();
    expect(out.headers.get("content-type")).toBe("text/html");
  });

  it("passes a response that is not HTML through untouched", async () => {
    const json = new Response("{}", { headers: { "content-type": "application/json" } });
    expect(await run(json).done).toBe(json);
  });

  it("reads the request only when locals.cookieyes is asked for, and only once", async () => {
    const request = new Request("https://example.com/", {
      headers: { "x-vercel-ip-country": "US", "x-vercel-ip-country-region": "CA" },
    });
    const get = vi.spyOn(request.headers, "get");
    const { locals, done } = run(html(), { request });
    await done;
    expect(get).not.toHaveBeenCalled();
    expect(locals.cookieyes.regulation).toBe("CCPA");
    const calls = get.mock.calls.length;
    expect(locals.cookieyes.region).toBe("US-CA");
    expect(get.mock.calls.length).toBe(calls);
  });

  it("gives a prerendered page the shared defaults without touching its headers", async () => {
    const request = new Request("https://example.com/");
    Object.defineProperty(request, "headers", {
      get() {
        throw new Error("build-time headers were read");
      },
    });
    const { locals, done } = run(html(), { prerendered: true, request });
    await done;
    expect(locals.cookieyes).toMatchObject({ read: false, regulation: "GDPR" });
  });

  it("copies the nonce the site's own middleware set in locals", async () => {
    const out = await run(html(), {
      during: (locals) => {
        locals.cookieyes.nonce = "abc";
      },
    }).done;
    expect(await out.text()).toContain('<script nonce="abc">s()</script><style nonce="abc">');
  });

  it("copies the nonces of a Content-Security-Policy header", async () => {
    const policy = "script-src 'nonce-sc'; style-src 'nonce-st'";
    const out = await run(html(PAGE, { "content-security-policy": policy })).done;
    const text = await out.text();
    expect(text).toContain('<script nonce="sc">');
    expect(text).toContain('<style nonce="st">');
  });

  it("never writes a nonce into a prerendered page", async () => {
    const policy = "script-src 'nonce-sc'";
    const out = await run(html(PAGE, { "content-security-policy": policy }), {
      prerendered: true,
    }).done;
    expect(await out.text()).not.toContain("nonce=");
  });
});

describe("caching of per-visitor responses", () => {
  const read = (locals: { cookieyes: CookieYesLocals }) => {
    void locals.cookieyes.regulation;
  };

  it("marks a response built from the request private and varies it on Cookie", async () => {
    const out = await run(html(PAGE, { vary: "Accept-Encoding" }), { during: read }).done;
    expect(out.headers.get("cache-control")).toBe("private");
    expect(out.headers.get("vary")).toBe("Accept-Encoding, Cookie");
    const json = new Response("{}", { headers: { "content-type": "application/json" } });
    const endpoint = await run(json, { during: read }).done;
    expect(endpoint.headers.get("cache-control")).toBe("private");
    expect(endpoint.headers.get("vary")).toBe("Cookie");
    expect(await endpoint.text()).toBe("{}");
  });

  it("keeps a shared-cache directive the site set, and warns in development", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const request = new Request("https://example.com/pricing");
    const shared = { "cache-control": "public, s-maxage=60" };
    const out = await run(html(PAGE, shared), { during: read, request, dev: true }).done;
    expect(out.headers.get("cache-control")).toBe("public, s-maxage=60");
    expect(out.headers.get("vary")).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("/pricing"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("export const prerender = true"));
    warn.mockClear();
    await run(html(PAGE, shared), { during: read }).done;
    await run(html(PAGE, { "cache-control": "no-store" }), { during: read, dev: true }).done;
    expect(warn).not.toHaveBeenCalled();
  });

  it("leaves a prerendered page and a request that was never read untouched", async () => {
    const prerendered = await run(html(), { prerendered: true, during: read }).done;
    expect(prerendered.headers.get("cache-control")).toBeNull();
    const unread = await run(html()).done;
    expect(unread.headers.get("cache-control")).toBeNull();
    const json = new Response("{}", { headers: { "content-type": "application/json" } });
    expect(await run(json).done).toBe(json);
  });
});
