// matrix/example-app-svelte/tests/ssr.assert.mjs
//
// The Svelte leg's server-render assertions. Run against the `vite build --ssr` output of one
// combination, by calling its `render` function directly: there is no live server, so this proves
// what `svelte/server` `render` produces on this Svelte version, not that a particular server framework
// forwards the Cookie header. Imported by matrix/scripts/run-combination.mjs and never throws
// past its own boundary; every failure is recorded in the returned result instead, so one
// combination's failure never aborts the others.

import { pathToFileURL } from "node:url";
// Imported from the tarball-installed @cookieyes/core inside this scratch project, so the cookie
// format is the one the SDK itself reads and writes, never hand-rolled here.
import { resolveCategories, serializeCookie } from "@cookieyes/core";

const COOKIE_NAME = "cookieyes-consent";
const CONSENT_ID = "peer-matrix-returning-visitor";
// Fixed rather than Date.now(): deterministic across runs.
const LAST_RENEWED = 1_700_000_000_000;

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
 * @param {{ serverEntry: string }} options absolute path of the built server entry
 * @returns {Promise<{ outcome: "pass" | "fail", assertions: Array<{ name: string, outcome: "pass" | "fail" }>, notes: string | null }>}
 */
export async function runSsrAssertions({ serverEntry }) {
  const assertions = [
    { name: "fresh-visitor-banner-html-present", outcome: "fail" },
    { name: "returning-visitor-banner-absent", outcome: "fail" },
    { name: "returning-visitor-cookie-value-correct", outcome: "fail" },
    { name: "ccpa-visitor-opt-out-banner-html-present", outcome: "fail" },
    { name: "banner-html-has-no-inline-style", outcome: "fail" },
  ];
  const failureNotes = [];

  try {
    const { render } = await import(pathToFileURL(serverEntry).href);

    const fresh = await render({ cookieHeader: "", regulation: "GDPR" });
    if (fresh.html.includes("data-cky-banner")) {
      assertions[0].outcome = "pass";
    } else {
      failureNotes.push(
        "fresh-visitor-banner-html-present: a fresh visitor did not get `data-cky-banner` in the " +
          "server-rendered HTML.",
      );
    }

    const { header, expectedSnapshot } = buildReturningVisitorCookie();
    const returning = await render({ cookieHeader: header, regulation: "GDPR" });
    if (!returning.html.includes("data-cky-banner")) {
      assertions[1].outcome = "pass";
    } else {
      failureNotes.push(
        "returning-visitor-banner-absent: a returning visitor with a valid, already-decided " +
          "cookie still got `data-cky-banner` in the HTML, which would flash on hydration.",
      );
    }

    if (JSON.stringify(returning.initialConsent) === JSON.stringify(expectedSnapshot)) {
      assertions[2].outcome = "pass";
    } else {
      failureNotes.push(
        "returning-visitor-cookie-value-correct: the server read " +
          `${JSON.stringify(returning.initialConsent)}, expected ${JSON.stringify(expectedSnapshot)}.`,
      );
    }

    const ccpa = await render({ cookieHeader: "", regulation: "CCPA" });
    if (ccpa.html.includes("data-cky-banner") && ccpa.html.includes("Do Not Sell")) {
      assertions[3].outcome = "pass";
    } else {
      failureNotes.push(
        "ccpa-visitor-opt-out-banner-html-present: a fresh CCPA visitor did not get the opt-out " +
          "banner (`data-cky-banner` and `Do Not Sell`) in the HTML.",
      );
    }

    // A `style=` attribute in server HTML breaks under a strict Content-Security-Policy.
    if (!/\sstyle=/.test(fresh.html + fresh.head) && !/\sstyle=/.test(ccpa.html + ccpa.head)) {
      assertions[4].outcome = "pass";
    } else {
      failureNotes.push(
        "banner-html-has-no-inline-style: the server-rendered banner carries a `style=` attribute.",
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
