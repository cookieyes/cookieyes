/**
 * Deleting a cookie only works if you match the domain it was set with. Vendor
 * cookies like Meta's `_fbp` or Segment's `ajs_*` are usually set on the
 * *registrable* domain (e.g. `.example.com`), so a plain host-only delete leaves
 * them behind. We can't read a cookie's domain back, so we expire it host-only
 * *and* on every parent domain of the current host.
 */

/** Parent domains to try, widest-first excluded: from the full host down to the registrable pair. */
export function cookieDomains(hostname: string): string[] {
  const parts = hostname.split(".");
  const domains: string[] = [];
  // Stop before a single-label TLD (you can't set a cookie on ".com").
  for (let i = 0; i < parts.length - 1; i++) {
    domains.push(parts.slice(i).join("."));
  }
  return domains;
}

/** The `document.cookie` strings that expire `name` host-only and on each parent domain of `hostname`. */
export function cookieExpiries(name: string, hostname: string): string[] {
  const out = [`${name}=; max-age=0; path=/`]; // host-only
  for (const domain of cookieDomains(hostname)) {
    out.push(`${name}=; max-age=0; path=/; domain=.${domain}`);
  }
  return out;
}

/** Expire a cookie host-only and on each parent domain, so a domain-scoped cookie is really removed. */
export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  const host = typeof location !== "undefined" ? location.hostname : "";
  for (const expiry of cookieExpiries(name, host)) document.cookie = expiry;
}
