// @vitest-environment node
import type { Handle, RequestEvent } from "@sveltejs/kit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cookieyesHandle } from "../handle.js";
import { CRITICAL_CSS } from "../styles.js";
import { setBuilding } from "./stubs/app-environment.js";
import { setBase } from "./stubs/app-paths.js";

type Options = { transformPageChunk?: (input: { html: string; done: boolean }) => unknown };

const PAGE =
  '<!doctype html><html><head><meta charset="utf-8" /><title>T</title></head><body>x</body></html>';

function event(headers: Record<string, string> = {}): RequestEvent {
  return {
    request: new Request("https://example.com/", { headers }),
    locals: {},
  } as unknown as RequestEvent;
}

/** Runs a handle against a `resolve` that renders `html` through the transform it was given. */
async function run(handle: Handle, e: RequestEvent, html: string = PAGE) {
  let transformed = "";
  const resolve = vi.fn(async (_event: unknown, options?: Options) => {
    transformed = (await options?.transformPageChunk?.({ html, done: true })) as string;
    return new Response(transformed);
  });
  await handle({ event: e, resolve } as never);
  return { resolve, html: transformed };
}

afterEach(() => {
  setBuilding(false);
  setBase("");
});

describe("cookieyesHandle", () => {
  it("reads the request once onto event.locals.cookieyes, before resolve", async () => {
    const e = event({
      "x-vercel-ip-country": "US",
      "x-vercel-ip-country-region": "CA",
      "sec-gpc": "1",
    });
    let seenAtResolve: unknown;
    const handle = cookieyesHandle({ mode: "cookie-only", regulation: "GDPR" });
    await handle({
      event: e,
      resolve: async () => {
        seenAtResolve = e.locals.cookieyes;
        return new Response("");
      },
    } as never);
    expect(seenAtResolve).toMatchObject({ read: true, region: "US-CA", gpc: true });
  });

  it("calls resolve once", async () => {
    const { resolve } = await run(cookieyesHandle({ mode: "cookie-only" }), event());
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it("passes a response that is not HTML through untouched", async () => {
    const response = new Response('{"ok":true}', {
      headers: { "content-type": "application/json" },
    });
    // SvelteKit applies `transformPageChunk` to HTML only, so a JSON endpoint never reaches it.
    const resolve = vi.fn(async () => response);
    const result = await cookieyesHandle({ mode: "cookie-only" })({
      event: event(),
      resolve,
    } as never);
    expect(result).toBe(response);
    expect(await result.text()).toBe('{"ok":true}');
  });

  it("reads nothing while building: a prerendered page is the same for every visitor", async () => {
    setBuilding(true);
    const e = event({
      cookie: "cookieyes-consent=consentid:abc",
      "sec-gpc": "1",
      "cf-ipcountry": "DE",
    });
    await run(cookieyesHandle({ mode: "cookie-only" }), e);
    expect(e.locals.cookieyes).toEqual({
      read: false,
      initialConsent: null,
      region: undefined,
      forcedRegion: undefined,
      gpc: false,
    });
  });

  it("writes the critical CSS and the deferred stylesheet right after the charset", async () => {
    const { html } = await run(cookieyesHandle({ mode: "cookie-only" }), event());
    expect(html).toMatch(
      new RegExp(
        `<meta charset="utf-8" /><style>${CRITICAL_CSS}</style><link rel="stylesheet" href="/cookieyes/styles\\.css\\?v=[^"]+" media="print" data-cy-full><title>`,
      ),
    );
  });

  it("links the stylesheet under the path set in stylesHref and the app's base path", async () => {
    setBase("/shop");
    const { html } = await run(
      cookieyesHandle({ mode: "cookie-only", stylesHref: "/assets/cy.css" }),
      event(),
    );
    expect(html).toContain('href="/shop/assets/cy.css?v=');
  });

  it("adds the Consent Mode default before the style when asked, and not otherwise", async () => {
    const on = await run(
      cookieyesHandle({ mode: "cookie-only", googleConsentMode: true }),
      event(),
    );
    expect(on.html.indexOf("<script>")).toBeGreaterThan(on.html.indexOf("<meta charset"));
    expect(on.html.indexOf("<script>")).toBeLessThan(on.html.indexOf("<style>"));
    const off = await run(cookieyesHandle({ mode: "cookie-only" }), event());
    expect(off.html).not.toContain("<script>");
  });

  it("copies the nonce SvelteKit put on its own script onto the Consent Mode script only", async () => {
    const page = PAGE.replace("x</body>", '<script nonce="N0nce">boot()</script></body>');
    const { html } = await run(
      cookieyesHandle({ mode: "cookie-only", googleConsentMode: true }),
      event(),
      page,
    );
    expect(html).toContain('<script nonce="N0nce">window.dataLayer');
    expect(html).toContain(`<style>${CRITICAL_CSS}</style>`);
    expect(html.match(/nonce="N0nce"/g)).toHaveLength(2);
  });

  it("adds no nonce attribute when the page has none", async () => {
    const { html } = await run(
      cookieyesHandle({ mode: "cookie-only", googleConsentMode: true }),
      event(),
    );
    expect(html).not.toContain("nonce");
  });

  it("does not hand stylesHref or googleConsentMode to the consent reader", async () => {
    const e = event();
    await run(
      cookieyesHandle({ mode: "cookie-only", stylesHref: "/x.css", googleConsentMode: true }),
      e,
    );
    expect(e.locals.cookieyes.read).toBe(true);
  });

  it("places the tags on the first chunk that holds an anchor when the page streams", async () => {
    const handle = cookieyesHandle({ mode: "cookie-only" });
    let transform: Options["transformPageChunk"];
    await handle({
      event: event(),
      resolve: async (_e: unknown, options?: Options) => {
        transform = options?.transformPageChunk;
        return new Response("");
      },
    } as never);
    expect(transform?.({ html: "<!doctype html>", done: false })).toBe("<!doctype html>");
    expect(transform?.({ html: '<head><meta charset="utf-8" />', done: false })).toContain(
      "<style>",
    );
    expect(transform?.({ html: '<meta charset="utf-8">', done: true })).toBe(
      '<meta charset="utf-8">',
    );
  });

  it("falls back to the start of the last chunk when no chunk had an anchor", async () => {
    const handle = cookieyesHandle({ mode: "cookie-only" });
    let transform: Options["transformPageChunk"];
    await handle({
      event: event(),
      resolve: async (_e: unknown, options?: Options) => {
        transform = options?.transformPageChunk;
        return new Response("");
      },
    } as never);
    expect(transform?.({ html: "<body>", done: true })).toMatch(/^<style>/);
  });

  it("composes under sequence(): both transformPageChunk functions run", async () => {
    const { sequence } = await import("@sveltejs/kit/hooks");
    const { with_request_store } = await import("@sveltejs/kit/internal/server");
    const second: Handle = ({ event: e, resolve }) =>
      resolve(e, {
        transformPageChunk: ({ html }) => html.replace("<title>T</title>", "<title>Mine</title>"),
      });
    const handle = sequence(cookieyesHandle({ mode: "cookie-only" }), second);
    const e = event();
    // `sequence` reads the request store SvelteKit sets up around every request.
    const state = { tracing: { record_span: ({ fn }: { fn: (c: unknown) => unknown }) => fn({}) } };
    const { html } = await with_request_store({ event: e, state } as never, () => run(handle, e));
    expect(html).toContain("<title>Mine</title>");
    expect(html).toContain("<style>");
    expect(e.locals.cookieyes.read).toBe(true);
  });
});
