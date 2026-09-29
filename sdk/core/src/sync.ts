import { hashString } from "./categories.js";
import type {
  ConsentAction,
  ConsentConfig,
  ConsentPayload,
  ConsentSnapshot,
  ConsentSource,
} from "./types.js";

// Module-scoped, for the dev-only guard below; see deprecations.ts for why.
declare const process: { env: { NODE_ENV?: string } };

/** What the visitor did, and where. Recorded with the decision, so it can be proven later. */
export type ConsentDecision = { action: ConsentAction; source: ConsentSource };

export function buildConsentPayload(
  snapshot: ConsentSnapshot,
  region?: string,
  decision?: ConsentDecision,
): ConsentPayload {
  const domain = typeof window !== "undefined" ? window.location.hostname : "unknown";
  // The moment of the decision (set when it was saved), never the moment of sending.
  const decidedMs = snapshot.lastRenewed ?? Date.now();
  const payload: ConsentPayload = {
    // Built only from the record's own fields, so the same decision always gets the
    // same id. The random consentId plus the decision time keeps different ones apart.
    // Category order is the taxonomy's, so the same choice always stringifies the same.
    recordId: `${snapshot.consentId}.${decidedMs.toString(36)}.${hashString(
      domain + JSON.stringify(snapshot.categories) + decision?.action + decision?.source,
    )}`,
    consentId: snapshot.consentId,
    categories: snapshot.categories,
    regulation: snapshot.regulation,
    domain,
    decidedAt: new Date(decidedMs).toISOString(),
    taxonomyHash: snapshot.taxonomyHash,
    ...decision,
  };
  if (region) payload.region = region;
  return payload;
}

/** Where records go: your endpoint, or your own adapter. */
export type ConsentRecordTarget = Pick<ConsentConfig, "apiUrl" | "apiKey" | "backend">;

/**
 * Send one record. Resolves `true` only once it is confirmed: a 2xx response, or your
 * adapter resolving. Never rejects, so a broken server can't break the banner.
 */
export async function sendConsentRecord(
  target: ConsentRecordTarget,
  payload: ConsentPayload,
): Promise<boolean> {
  let failure: string | undefined;
  try {
    if (target.backend) {
      await target.backend.persist(payload);
    } else if (target.apiUrl) {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (target.apiKey) headers.Authorization = `Bearer ${target.apiKey}`;
      const response = await fetch(target.apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        keepalive: true,
      });
      // fetch only rejects on a network error; a 500 still resolves.
      if (!response.ok) failure = `HTTP ${response.status}`;
    }
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  }
  if (failure === undefined) return true;
  warnRecordNotSent(failure);
  return false;
}

function warnRecordNotSent(reason: string): void {
  if (process.env.NODE_ENV === "production") return;
  if (typeof console === "undefined") return;
  // eslint-disable-next-line no-console
  console.warn(`[cookieyes] A consent record did not reach your server (${reason}).`);
}
