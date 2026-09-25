/**
 * Where browsers send Content-Security-Policy violation reports while the policy runs in
 * report-only mode (see next.config.mjs). Each report is written to the runtime log as one
 * line, so the Vercel logs can be searched for "csp-violation" to see what the policy
 * would have blocked before it is enforced.
 *
 * Browsers post two shapes: the older `report-uri` body (`{"csp-report": {…}}`, sent as
 * application/csp-report) and the Reporting API's list of reports (application/reports+json,
 * each with a `body`). Both are reduced to the same few fields.
 */

/** Reports are small; anything larger is not a genuine browser report. */
const MAX_BODY_BYTES = 16_384;

type Violation = {
  page: string;
  blocked: string;
  directive: string;
  source?: string;
  line?: number;
};

/** Origin and path only: a query string can carry a visitor's own data. */
function trimUrl(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    // "inline", "eval", "data", "self" and similar keywords are not URLs.
    return value.slice(0, 100);
  }
}

function fromLegacy(report: Record<string, unknown>): Violation {
  return {
    page: trimUrl(report["document-uri"]),
    blocked: trimUrl(report["blocked-uri"]),
    directive: String(report["effective-directive"] ?? report["violated-directive"] ?? ""),
    source: trimUrl(report["source-file"]) || undefined,
    line: typeof report["line-number"] === "number" ? report["line-number"] : undefined,
  };
}

function fromReportingApi(body: Record<string, unknown>): Violation {
  return {
    page: trimUrl(body.documentURL),
    blocked: trimUrl(body.blockedURL),
    directive: String(body.effectiveDirective ?? ""),
    source: trimUrl(body.sourceFile) || undefined,
    line: typeof body.lineNumber === "number" ? body.lineNumber : undefined,
  };
}

function parse(payload: unknown): Violation[] {
  if (Array.isArray(payload)) {
    return payload
      .filter((entry) => entry?.type === "csp-violation" && entry.body)
      .map((entry) => fromReportingApi(entry.body));
  }
  if (payload && typeof payload === "object" && "csp-report" in payload) {
    return [fromLegacy((payload as { "csp-report": Record<string, unknown> })["csp-report"])];
  }
  return [];
}

/** Browser extensions inject their own scripts into every page; those are not ours to allow. */
function isExtension(violation: Violation): boolean {
  return /^(chrome|moz|safari(-web)?|ms-browser)-extension/.test(
    violation.blocked || violation.source || "",
  );
}

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }

  for (const violation of parse(payload)) {
    if (isExtension(violation)) continue;
    console.warn(`csp-violation ${JSON.stringify(violation)}`);
  }
  return new Response(null, { status: 204 });
}
