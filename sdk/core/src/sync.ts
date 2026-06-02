import type { ConsentPayload, ConsentSnapshot } from "./types.js";

export function buildConsentPayload(snapshot: ConsentSnapshot): ConsentPayload {
  return {
    consentId: snapshot.consentId,
    categories: snapshot.categories,
    regulation: snapshot.regulation,
    domain: typeof window !== "undefined" ? window.location.hostname : "unknown",
  };
}

export async function pushConsent(
  apiUrl: string,
  apiKey: string | undefined,
  snapshot: ConsentSnapshot,
): Promise<void> {
  const payload = buildConsentPayload(snapshot);

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
