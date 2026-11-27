// matrix/example-app-astro/tests/ssr.assert.mjs
//
// The Astro legs' server-render assertions. `runSsrAssertions` runs over real HTTP against the
// built Node-adapter server (`node dist/server/entry.mjs`) of one combination, so the middleware
// reads the Cookie and geo headers from a real request. `runStaticAssertions` reads the file Astro
// wrote for the app's prerendered page. Both are imported by matrix/scripts/run-combination.mjs and
// never throw past their own boundary; every failure is recorded in the returned result instead, so
// one combination's failure never aborts the others.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
// Imported from the tarball-installed @cookieyes/core inside this scratch project, so the cookie
// format is the one the SDK itself reads and writes, never hand-rolled here.
import { resolveCategories, serializeCookie } from "@cookieyes/core";

const COOKIE_NAME = "cookieyes-consent";
const CONSENT_ID = "peer-matrix-returning-visitor";
// Fixed rather than Date.now(): deterministic across runs.
const LAST_RENEWED = 1_700_000_000_000;
// astro.config.mjs maps US-CA to CCPA; these are the Vercel geo headers the middleware reads.
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

/** Reads the consent the page printed from `getServerConsent(Astro)`, or `undefined` when absent. */
function readPrintedConsent(html) {
  const raw = /<p id="consent" data-consent="([^"]*)"/.exec(html)?.[1];
  if (raw === undefined) return undefined;
  // Astro 6.0 writes a quote as `&#34;` where later versions write `&quot;`.
  return JSON.parse(
    raw.replaceAll("&quot;", '"').replaceAll("&#34;", '"').replaceAll("&amp;", "&"),
  );
}

/** Positions of the head tags the integration writes, and of the page's own charset tag. */
function headOrder(html) {
  const at = (needle) => html.indexOf(needle);
  return {
    charset: html.search(/<meta charset/i),
    consentMode: at("gtag('consent','default'"),
    prepaint: at('setAttribute("data-cy-banner","show")'),
    style: at("<style>"),
    link: html.search(/<link rel="stylesheet" href="[^"]*cookieyes\/styles\.css/),
  };
}

function isInOrder(order) {
  const { charset, consentMode, prepaint, style, link } = order;
  return (
    charset >= 0 &&
    charset < consentMode &&
    consentMode < prepaint &&
    prepaint < style &&
    style < link
  );
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
          `cookie still got \`${BANNER}\` in the HTML, which would flash on load.`,
      );
    }

    // What the page's own code sees through the public `getServerConsent(Astro)`.
    const read = readPrintedConsent(returning);
    if (JSON.stringify(read) === JSON.stringify(expectedSnapshot)) {
      assertions[2].outcome = "pass";
    } else {
      failureNotes.push(
        "returning-visitor-cookie-value-correct: getServerConsent returned " +
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
          "script, the head script, the critical <style> and the deferred stylesheet link; " +
          `offsets were ${JSON.stringify(order)}.`,
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
 * The app's prerendered page, as Astro wrote it to disk: nothing about one visitor is in it, the
 * banner is held hidden until the head script reveals it, and the head tags are in place.
 *
 * @param {{ buildDir: string }} options the Astro build's `dist/client` directory
 * @returns {{ outcome: "pass" | "fail", assertions: Array<{ name: string, outcome: "pass" | "fail" }>, notes: string | null }}
 */
export function runStaticAssertions({ buildDir }) {
  const assertions = [
    { name: "prerendered-page-holds-banner-hidden", outcome: "fail" },
    { name: "prerendered-page-carries-no-visitor-state", outcome: "fail" },
    { name: "prerendered-page-head-tags-in-order-after-charset", outcome: "fail" },
  ];
  const failureNotes = [];

  try {
    const page = join(buildDir, "static", "index.html");
    const html = existsSync(page) ? readFileSync(page, "utf8") : "";
    if (
      html.includes(BANNER) &&
      /<div class="cy-banner-wrap" data-cy-shell data-cy-wait>/.test(html)
    ) {
      assertions[0].outcome = "pass";
    } else {
      failureNotes.push(
        `prerendered-page-holds-banner-hidden: ${page} is missing, or its banner is not held ` +
          "behind `data-cy-wait` for the head script to reveal.",
      );
    }

    if (html.includes('"request":{"read":false}')) {
      assertions[1].outcome = "pass";
    } else {
      failureNotes.push(
        'prerendered-page-carries-no-visitor-state: the page data does not say `"request":{"read":false}`.',
      );
    }

    const order = headOrder(html);
    if (isInOrder(order)) {
      assertions[2].outcome = "pass";
    } else {
      failureNotes.push(
        `prerendered-page-head-tags-in-order-after-charset: offsets were ${JSON.stringify(order)}.`,
      );
    }
  } catch (error) {
    failureNotes.push(
      `unexpected error while running prerendered page assertions: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return summarise(assertions, failureNotes);
}
