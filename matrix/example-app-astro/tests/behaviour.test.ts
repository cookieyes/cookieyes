// matrix/example-app-astro/tests/behaviour.test.ts
//
// Client behaviour in jsdom, run inside the scratch project so it exercises this combination's
// installed @cookieyes/astro, never the repo's copy: the page entry's boot shows the banner to a
// first-time visitor, accepting writes the decision to the cookie the server reads on the next
// request, and the public `getConsentCategory` reports it. The server-rendered HTML is covered by
// the HTTP assertions, not here.

import { afterEach, beforeEach, expect, test, vi } from "vitest";

type Client = typeof import("@cookieyes/astro/client");

/** A fresh copy of the client module, as each page visit gets: its boot runs once per copy. */
async function load(): Promise<Client> {
  vi.resetModules();
  return import("@cookieyes/astro/client");
}

// What <CookieYesRoot /> prints for the page entry to read.
const PAGE =
  '<div id="cookieyes-portal-root"></div>' +
  '<script type="application/json" id="cookieyes-page">' +
  '{"surfaces":["banner","preferences","recall"],"classNames":{},"request":{"read":false}}' +
  "</script>";

beforeEach(() => {
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
  document.body.innerHTML = PAGE;
});

afterEach(async () => {
  const { resetConsentRuntime } = await import("@cookieyes/core");
  resetConsentRuntime();
  document.body.innerHTML = "";
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
});

const banner = () => document.querySelector('[data-cy-part="banner"]');

test("the page entry shows the banner to a first-time visitor", async () => {
  (await load())._boot({ mode: "cookie-only", regulation: "GDPR" }, {});

  await expect.poll(banner).not.toBeNull();
});

test("accepting in the banner writes the consent cookie and hides the banner", async () => {
  (await load())._boot({ mode: "cookie-only", regulation: "GDPR" }, {});
  await expect.poll(banner).not.toBeNull();

  document.querySelector<HTMLButtonElement>('[data-cy-part="accept-all"]')?.click();

  await expect.poll(banner).toBeNull();
  expect(document.cookie).toMatch(/(?:^|;\s*)cookieyes-consent=/);
});

test("getConsentCategory reports a category once it is granted", async () => {
  const client = await load();
  client._boot({ mode: "cookie-only", regulation: "GDPR" }, {});
  expect(await client.getConsentCategory("analytics")).toBe(false);

  client.getConsentActions().acceptAll();

  await expect.poll(() => client.getConsentCategory("analytics")).toBe(true);
});
