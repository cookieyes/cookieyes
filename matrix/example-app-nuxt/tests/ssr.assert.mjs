// matrix/example-app-nuxt/tests/ssr.assert.mjs
//
// The Nuxt legs' server-render assertions. Run over real HTTP against the built Nitro server
// (`node .output/server/index.mjs`) of one combination, so the module reads the Cookie and geo
// headers from a real request. Imported by matrix/scripts/run-combination.mjs and never throws past
// its own boundary; every failure is recorded in the returned result instead, so one combination's
// failure never aborts the others.

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
// Imported from the tarball-installed @cookieyes/core inside this scratch project, so the cookie
// format is the one the SDK itself reads and writes, never hand-rolled here.
import { resolveCategories, serializeCookie } from "@cookieyes/core";

const COOKIE_NAME = "cookieyes-consent";
const CONSENT_ID = "peer-matrix-returning-visitor";
// Fixed rather than Date.now(): deterministic across runs.
const LAST_RENEWED = 1_700_000_000_000;
// nuxt.config.ts maps US-CA to CCPA; these are the Vercel geo headers the module reads.
const CALIFORNIA = { "x-vercel-ip-country": "US", "x-vercel-ip-country-region": "CA" };
const BANNER = 'data-cy-part="banner"';
// The module hands what the server read to the client through this `useState` key in the Nuxt
// payload. It is internal to @cookieyes/nuxt; if it is renamed, this assertion fails loudly.
const STATE_KEY = "$scookieyes:request";

/** Builds the cookie header a returning, already-decided GDPR visitor would carry. */
function buildReturningVisitorCookie() {
  const resolved = resolveCategories();
  const categories = {};
  for (const id of resolved.ids) categories[id] = true;

  const snapshot = {
    consentId: CONSENT_ID,
    hasActed: true,
    categories,
    regulation: "GDPR",
    lastRenewed: LAST_RENEWED,
    taxonomyHash: resolved.taxonomyHash,
  };
  return {
    header: `${COOKIE_NAME}=${encodeURIComponent(serializeCookie(snapshot))}`,
    expectedSnapshot: snapshot,
  };
}

/**
 * Reads the Nuxt payload out of the HTML with the devalue copy this Nuxt itself serialised it
 * with, resolved from Nuxt's own dependencies so the example app declares nothing extra. Nuxt's
 * reactive wrappers are unwrapped to their plain values.
 */
async function readPayload(html) {
  const match = /<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!match) return undefined;
  const nuxtRequire = createRequire(createRequire(import.meta.url).resolve("nuxt/package.json"));
  const { parse } = await import(pathToFileURL(nuxtRequire.resolve("devalue")).href);
  const identity = (value) => value;
  const emptyRef = (value) => (value === "_" ? undefined : JSON.parse(value));
  return parse(match[1], {
    NuxtError: identity,
    EmptyShallowRef: emptyRef,
    EmptyRef: emptyRef,
    ShallowRef: identity,
    ShallowReactive: identity,
    Ref: identity,
    Reactive: identity,
    Island: identity,
  });
}

/**
 * @param {{ baseUrl: string }} options the running server's base URL
 * @returns {Promise<{ outcome: "pass" | "fail", assertions: Array<{ name: string, outcome: "pass" | "fail" }>, notes: string | null }>}
 */
export async function runSsrAssertions({ baseUrl }) {
  const assertions = [
    { name: "fresh-visitor-banner-html-present", outcome: "fail" },
    { name: "returning-visitor-banner-absent", outcome: "fail" },
    { name: "returning-visitor-cookie-value-correct", outcome: "fail" },
    { name: "ccpa-visitor-opt-out-banner-html-present", outcome: "fail" },
    { name: "banner-html-has-no-inline-style", outcome: "fail" },
  ];
  const failureNotes = [];
  const html = async (headers) => (await fetch(baseUrl, { headers })).text();

  try {
    const fresh = await html({});
    if (fresh.includes(BANNER)) {
      assertions[0].outcome = "pass";
    } else {
      failureNotes.push(
        `fresh-visitor-banner-html-present: a fresh visitor did not get \`${BANNER}\` in the ` +
          "server-rendered HTML.",
      );
    }

    const { header, expectedSnapshot } = buildReturningVisitorCookie();
    const returning = await html({ cookie: header });
    if (!returning.includes(BANNER)) {
      assertions[1].outcome = "pass";
    } else {
      failureNotes.push(
        "returning-visitor-banner-absent: a returning visitor with a valid, already-decided " +
          `cookie still got \`${BANNER}\` in the HTML, which would flash on hydration.`,
      );
    }

    // What the client's first render uses: the payload carries the server's read to the browser.
    const read = (await readPayload(returning))?.state?.[STATE_KEY]?.initialConsent;
    if (JSON.stringify(read) === JSON.stringify(expectedSnapshot)) {
      assertions[2].outcome = "pass";
    } else {
      failureNotes.push(
        "returning-visitor-cookie-value-correct: the payload carried " +
          `${JSON.stringify(read)}, expected ${JSON.stringify(expectedSnapshot)}.`,
      );
    }

    const ccpa = await html(CALIFORNIA);
    if (ccpa.includes(BANNER) && ccpa.includes("Do Not Sell")) {
      assertions[3].outcome = "pass";
    } else {
      failureNotes.push(
        "ccpa-visitor-opt-out-banner-html-present: a fresh visitor the geo headers place in " +
          `California did not get the opt-out banner (\`${BANNER}\` and \`Do Not Sell\`) in the HTML.`,
      );
    }

    // A `style=` attribute in server HTML breaks under a strict Content-Security-Policy.
    if (!/\sstyle=/.test(fresh) && !/\sstyle=/.test(ccpa)) {
      assertions[4].outcome = "pass";
    } else {
      failureNotes.push(
        "banner-html-has-no-inline-style: the server-rendered page carries a `style=` attribute.",
      );
    }
  } catch (error) {
    failureNotes.push(
      `unexpected error while running SSR assertions: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const outcome = assertions.every((a) => a.outcome === "pass") ? "pass" : "fail";
  return {
    outcome,
    assertions,
    notes: failureNotes.length > 0 ? failureNotes.join(" ") : null,
  };
}
