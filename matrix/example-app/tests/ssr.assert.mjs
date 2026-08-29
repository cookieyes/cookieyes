// matrix/example-app/tests/ssr.assert.mjs
//
// Test A — `await cookies()` reads the real request value, on every Next
// version. Run against a real `next build && next start` for one
// combination (real HTTP, real Node `fetch`, no browser). Imported and
// invoked by matrix/scripts/run-combination.mjs with that combination's
// running server's base URL — never throws past its own boundary; every
// assertion failure is recorded in the returned result instead, so one
// combination's SSR failure never aborts the others (§8: each combo's
// `outcome` is independent).
//
// See ai-context/designs/peer-dependency-matrix.md §5.4 (Test A).

// Imported from the tarball-installed @cookieyes/core inside this scratch
// project — the exact cookie format the SDK itself reads/writes, never
// hand-rolled here.
import { resolveCategories, serializeCookie } from "@cookieyes/core";

const COOKIE_NAME = "cookieyes-consent";
const CONSENT_ID = "peer-matrix-returning-visitor";
// Fixed, not Date.now(): deterministic across runs, and readServerConsent
// round-trips it verbatim (Number(fields.lastRenewedDate)).
const LAST_RENEWED = 1_700_000_000_000;

/** Builds the exact cookie value a returning, already-decided GDPR visitor would carry. */
function buildReturningVisitorCookie() {
  const resolved = resolveCategories(); // default five categories
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

  const cookieValue = encodeURIComponent(serializeCookie(snapshot));
  return {
    header: `${COOKIE_NAME}=${cookieValue}`,
    // What getServerConsent() is expected to hand back, byte for byte — this
    // is the value assertion (step 4): a decoder reading the wrong cookie, or
    // truncating, or defaulting, would leave the banner absent (passing steps
    // 1-3) while echoing something other than this back (failing this one).
    expectedSnapshot: {
      consentId: CONSENT_ID,
      hasActed: true,
      categories,
      regulation: "GDPR",
      lastRenewed: LAST_RENEWED,
      taxonomyHash: resolved.taxonomyHash,
    },
  };
}

function extractDebugMarker(html) {
  const match = /<script id="cy-test-consent"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!match) return { found: false, value: undefined };
  try {
    return { found: true, value: JSON.parse(match[1]) };
  } catch {
    return { found: true, value: undefined };
  }
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * @param {{ baseUrl: string }} options
 * @returns {Promise<{ outcome: "pass" | "fail", assertions: Array<{ name: string, outcome: "pass" | "fail" }>, notes: string | null }>}
 */
export async function runSsrAssertions({ baseUrl }) {
  const assertions = [
    { name: "fresh-visitor-banner-html-present", outcome: "fail" },
    { name: "returning-visitor-banner-absent", outcome: "fail" },
    { name: "returning-visitor-cookie-value-correct", outcome: "fail" },
  ];
  const failureNotes = [];

  try {
    // 1. Fresh visitor, no Cookie header — banner must be in the HTML.
    const freshResponse = await fetch(baseUrl, { headers: {} });
    const freshHtml = await freshResponse.text();
    if (freshHtml.includes("data-cky-banner")) {
      assertions[0].outcome = "pass";
    } else {
      failureNotes.push(
        "fresh-visitor-banner-html-present: a fresh visitor (no Cookie header) did not receive " +
          "`data-cky-banner` in the server-rendered HTML.",
      );
    }

    // 2-4. Returning, already-decided visitor.
    const { header, expectedSnapshot } = buildReturningVisitorCookie();
    const returningResponse = await fetch(baseUrl, { headers: { Cookie: header } });
    const returningHtml = await returningResponse.text();

    if (!returningHtml.includes("data-cky-banner")) {
      assertions[1].outcome = "pass";
    } else {
      failureNotes.push(
        "returning-visitor-banner-absent: a returning visitor with a valid, already-decided " +
          "consent cookie still received `data-cky-banner` in the HTML — getServerConsent() did " +
          "not suppress the banner (a broken/no-op `await cookies()` on this Next version would " +
          "produce exactly this symptom).",
      );
    }

    const marker = extractDebugMarker(returningHtml);
    if (marker.found && deepEqual(marker.value, expectedSnapshot)) {
      assertions[2].outcome = "pass";
    } else if (!marker.found) {
      failureNotes.push(
        "returning-visitor-cookie-value-correct: the #cy-test-consent debug marker was not found " +
          "in the response HTML.",
      );
    } else {
      failureNotes.push(
        "returning-visitor-cookie-value-correct: getServerConsent() returned a value that does " +
          `not match what was sent — expected ${JSON.stringify(expectedSnapshot)}, got ` +
          `${JSON.stringify(marker.value)}.`,
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
