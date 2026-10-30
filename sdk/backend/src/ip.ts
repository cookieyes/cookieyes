/** Headers a proxy or platform puts the visitor's address in, most trustworthy first. */
export const DEFAULT_IP_HEADERS = ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"] as const;

/** The caller's address as the first listed header reports it, or `null`. */
export function clientIp(headers: Headers, names: readonly string[]): string | null {
  for (const name of names) {
    // X-Forwarded-For lists every hop; the first is the client.
    const value = headers.get(name)?.split(",")[0]?.trim();
    if (value) return value;
  }
  return null;
}

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function truncateV4(ip: string): string | null {
  const parts = IPV4.exec(ip);
  if (!parts || parts.slice(1).some((p) => Number(p) > 255)) return null;
  return `${parts[1]}.${parts[2]}.${parts[3]}.0`;
}

function expandV6(ip: string): string[] | null {
  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  return groups.every((g) => /^[0-9a-f]{1,4}$/i.test(g)) ? groups : null;
}

/**
 * Drop the part of an address that identifies one device: the last octet of IPv4
 * (a /24), everything after the first three groups of IPv6 (a /48). `null` when the
 * text is not an address.
 */
export function truncateIp(ip: string): string | null {
  const address = ip.replace(/%.*$/, "").toLowerCase();
  if (address.includes(".")) {
    const mapped = address.startsWith("::ffff:") ? address.slice(7) : address;
    return truncateV4(mapped);
  }
  const groups = expandV6(address);
  return groups
    ? `${groups
        .slice(0, 3)
        .map((g) => g.replace(/^0+(?=.)/, ""))
        .join(":")}::`
    : null;
}

/** A keyed hash of the address: equal addresses match, but the address can't be read back. */
export async function hashIp(ip: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(ip)));
  return [...signature.slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
