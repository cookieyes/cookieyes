import type { ConsentPayload, ConsentSnapshot } from "./types.js";

export function buildConsentPayload(snapshot: ConsentSnapshot, region?: string): ConsentPayload {
  const payload: ConsentPayload = {
    consentId: snapshot.consentId,
    categories: snapshot.categories,
    regulation: snapshot.regulation,
    domain: typeof window !== "undefined" ? window.location.hostname : "unknown",
  };
  if (region) payload.region = region;
  return payload;
}

export async function pushConsent(
  apiUrl: string,
  apiKey: string | undefined,
  snapshot: ConsentSnapshot,
  region?: string,
): Promise<void> {
  const payload = buildConsentPayload(snapshot, region);

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
