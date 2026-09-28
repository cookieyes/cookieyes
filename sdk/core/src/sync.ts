import { hashString } from "./categories.js";
import type { ConsentAction, ConsentPayload, ConsentSnapshot, ConsentSource } from "./types.js";

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
    recordId: `${snapshot.consentId}.${decidedMs.toString(36)}.${hashString(domain + JSON.stringify(snapshot.categories))}`,
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

export async function pushConsent(
  apiUrl: string,
  apiKey: string | undefined,
  payload: ConsentPayload,
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  try {
    await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Backend sync is best-effort — never fail the consent flow
  }
}
