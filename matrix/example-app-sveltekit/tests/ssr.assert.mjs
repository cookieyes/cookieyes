// matrix/example-app-sveltekit/tests/ssr.assert.mjs
//
// The SvelteKit legs' server-render assertions. `runSsrAssertions` runs over real HTTP against the
// built adapter-node server (`node build/index.js`) of one combination, so the handle reads the
// Cookie and geo headers from a real request. `runStaticAssertions` reads the files of one extra
// adapter-static build of the same app. Both are imported by matrix/scripts/run-combination.mjs and
// never throw past their own boundary; every failure is recorded in the returned result instead, so
// one combination's failure never aborts the others.

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
// Imported from the tarball-installed @cookieyes/core inside this scratch project, so the cookie
// format is the one the SDK itself reads and writes, never hand-rolled here.
import { resolveCategories, serializeCookie } from "@cookieyes/core";

const COOKIE_NAME = "cookieyes-consent";
const CONSENT_ID = "peer-matrix-returning-visitor";
// Fixed rather than Date.now(): deterministic across runs.
const LAST_RENEWED = 1_700_000_000_000;
// src/lib/cookieyes.ts maps US-CA to CCPA; these are the Vercel geo headers the handle reads.
const CALIFORNIA = { "x-vercel-ip-country": "US", "x-vercel-ip-country-region": "CA" };
const BANNER = 'data-cy-part="banner"';
const STYLES_HREF = "/cookieyes/styles.css";
// A token the stylesheet always declares: proves the route returned the SDK's CSS, not some page.
const CSS_MARKER = "--cy-primary";

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
 * Reads `data.consent` the way SvelteKit's client does: from the data request for the page, with
 * the copy of devalue this SvelteKit itself serialises with, resolved from its own dependencies so
 * the example app declares nothing extra. `loadConsent` runs in the root layout, node 0.
 */
async function readConsentData(baseUrl, headers) {
  const res = await fetch(new URL("/__data.json", baseUrl), { headers });
  const body = await res.json();
  const kitRequire = createRequire(
    createRequire(import.meta.url).resolve("@sveltejs/kit/package.json"),
  );
  const { unflatten } = await import(pathToFileURL(kitRequire.resolve("devalue")).href);
  const layout = body.nodes?.find((node) => node?.type === "data");
  return layout ? unflatten(layout.data)?.consent : undefined;
}

/** Positions of the three head tags the handle writes, and of the page's own charset tag. */
function headOrder(html) {
  const at = (needle) => html.indexOf(needle);
  return {
    charset: html.search(/<meta charset/i),
    consentMode: at("gtag('consent','default'"),
    style: at("<style>"),
    // A prerendered page may carry the href in SvelteKit's relative form, `./cookieyes/...`.
    link: html.search(/<link rel="stylesheet" href="[^"]*cookieyes\/styles\.css/),
  };
}

function isInOrder(order) {
  const { charset, consentMode, style, link } = order;
  return charset >= 0 && charset < consentMode && consentMode < style && style < link;
}

function summarise(assertions, failureNotes) {
  const outcome = assertions.every((a) => a.outcome === "pass") ? "pass" : "fail";
  return { outcome, assertions, notes: failureNotes.length > 0 ? failureNotes.join(" ") : null };
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
    { name: "head-tags-in-order-after-charset", outcome: "fail" },
    { name: "banner-html-has-no-inline-style", outcome: "fail" },
    { name: "stylesheet-route-serves-css", outcome: "fail" },
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

    // What the client's first render uses: the page's data carries the server's read to the browser.
    const read = (await readConsentData(baseUrl, { cookie: header }))?.initialConsent;
    if (JSON.stringify(read) === JSON.stringify(expectedSnapshot)) {
      assertions[2].outcome = "pass";
    } else {
      failureNotes.push(
        "returning-visitor-cookie-value-correct: data.consent carried " +
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

    const order = headOrder(fresh);
    if (isInOrder(order)) {
      assertions[4].outcome = "pass";
    } else {
      failureNotes.push(
        "head-tags-in-order-after-charset: expected the charset tag, then the Consent Mode " +
          `script, the critical <style> and the deferred stylesheet link; offsets were ${JSON.stringify(order)}.`,
      );
    }

    // A `style=` attribute in server HTML breaks under a strict Content-Security-Policy.
    if (!/\sstyle=/.test(fresh) && !/\sstyle=/.test(ccpa)) {
      assertions[5].outcome = "pass";
    } else {
      failureNotes.push(
        "banner-html-has-no-inline-style: the server-rendered page carries a `style=` attribute.",
      );
    }

    const styles = await fetch(new URL(STYLES_HREF, baseUrl));
    const css = await styles.text();
    if (
      styles.status === 200 &&
      (styles.headers.get("content-type") ?? "").includes("text/css") &&
      css.includes(CSS_MARKER)
    ) {
      assertions[6].outcome = "pass";
    } else {
      failureNotes.push(
        `stylesheet-route-serves-css: ${STYLES_HREF} answered ${styles.status} with ` +
          `content-type "${styles.headers.get("content-type")}".`,
      );
    }
  } catch (error) {
    failureNotes.push(
      `unexpected error while running SSR assertions: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return summarise(assertions, failureNotes);
}

/**
 * The extra adapter-static build of the same app: its prerendered page carries the banner for
 * everyone, with the head tags in place, and the stylesheet route is written out as a file.
 *
 * @param {{ buildDir: string }} options the adapter-static output directory
 * @returns {{ outcome: "pass" | "fail", assertions: Array<{ name: string, outcome: "pass" | "fail" }>, notes: string | null }}
 */
export function runStaticAssertions({ buildDir }) {
  const assertions = [
    { name: "static-build-prerenders-banner-html", outcome: "fail" },
    { name: "static-build-head-tags-in-order-after-charset", outcome: "fail" },
    { name: "static-build-writes-stylesheet-file", outcome: "fail" },
  ];
  const failureNotes = [];

  try {
    const page = join(buildDir, "index.html");
    const html = existsSync(page) ? readFileSync(page, "utf8") : "";
    if (html.includes(BANNER)) {
      assertions[0].outcome = "pass";
    } else {
      failureNotes.push(
        `static-build-prerenders-banner-html: ${page} is missing or has no \`${BANNER}\`.`,
      );
    }

    const order = headOrder(html);
    if (isInOrder(order)) {
      assertions[1].outcome = "pass";
    } else {
      failureNotes.push(
        `static-build-head-tags-in-order-after-charset: offsets were ${JSON.stringify(order)}.`,
      );
    }

    const file = join(buildDir, STYLES_HREF.slice(1));
    const css = existsSync(file) ? readFileSync(file, "utf8") : "";
    if (css.includes(CSS_MARKER)) {
      assertions[2].outcome = "pass";
    } else {
      failureNotes.push(
        `static-build-writes-stylesheet-file: ${file} is missing or holds no banner CSS.`,
      );
    }
  } catch (error) {
    failureNotes.push(
      `unexpected error while running static build assertions: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return summarise(assertions, failureNotes);
}
