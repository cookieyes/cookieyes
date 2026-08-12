/**
 * The minimal `document.cookie` surface the consent engine actually touches.
 *
 * `@cookieyes/core` reads and writes the consent cookie through `document.cookie`
 * (`cookie.ts` — `readConsentCookie`, `writeConsentCookie`, `clearConsentCookie`)
 * and no-ops when no `document` exists. That no-op is what makes seeding a
 * returning visitor impossible in plain Node, so we give it the smallest possible
 * real thing to talk to instead of a fake browser.
 */

/** Cookie name owned by `@cookieyes/core` (`cookie.ts`). */
export const CONSENT_COOKIE_NAME = "cookieyes-consent";

type CookieHost = { cookie: string };

/** True when a cookie write is a deletion (`max-age<=0`, or an `expires` in the past). */
function isDeletion(attributes: string[]): boolean {
  for (const attribute of attributes) {
    const eq = attribute.indexOf("=");
    if (eq === -1) continue;
    const key = attribute.slice(0, eq).trim().toLowerCase();
    const value = attribute.slice(eq + 1).trim();
    if (key === "max-age" && Number(value) <= 0) return true;
    if (key === "expires") {
      const at = Date.parse(value);
      if (!Number.isNaN(at) && at <= Date.now()) return true;
    }
  }
  return false;
}

/**
 * An in-memory cookie jar with `document.cookie`'s exact semantics: reading
 * returns `name=value; name2=value2`, writing sets or replaces a single cookie,
 * and a write carrying `max-age=0` deletes it. Attributes other than the
 * expiry ones are accepted and ignored, as a browser would for `path`/`SameSite`.
 */
function createCookieJar(): CookieHost {
  const jar = new Map<string, string>();
  return {
    get cookie(): string {
      return Array.from(jar, ([name, value]) => `${name}=${value}`).join("; ");
    },
    set cookie(input: string) {
      const parts = input.split(";");
      const pair = parts[0];
      if (pair === undefined) return;
      const eq = pair.indexOf("=");
      if (eq === -1) return;
      const name = pair.slice(0, eq).trim();
      if (name.length === 0) return;
      if (isDeletion(parts.slice(1))) {
        jar.delete(name);
        return;
      }
      jar.set(name, pair.slice(eq + 1).trim());
    },
  };
}

let restore: (() => void) | null = null;

/**
 * Install the in-memory jar as `globalThis.document`, but only when there is no
 * `document` already. A jsdom/happy-dom environment is left completely alone —
 * clobbering a real DOM would break every other test in that file.
 *
 * The jar stays installed until {@link restoreDocument}, not just for
 * construction: core's `persist()` writes the cookie on *every* decision, so an
 * early restore would silently swallow all of them.
 */
export function installDocumentShim(): void {
  if (restore) return;
  if (typeof globalThis.document !== "undefined") return;

  Object.defineProperty(globalThis, "document", {
    value: createCookieJar(),
    configurable: true,
    writable: true,
  });
  restore = () => {
    Reflect.deleteProperty(globalThis, "document");
  };
}

/** Remove a jar installed by {@link installDocumentShim}. Idempotent. */
export function restoreDocument(): void {
  restore?.();
  restore = null;
}

/** True when this process is running against a jar we installed. */
export function isDocumentShimmed(): boolean {
  return restore !== null;
}

/**
 * Expire the consent cookie. Runs against whichever `document` is in play (jar
 * or jsdom), so a cookie left behind by an earlier test can't leak into the next
 * harness.
 */
export function clearConsentCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${CONSENT_COOKIE_NAME}=; max-age=0; path=/`;
}

/** Write a pre-serialized consent cookie value, encoded the way core encodes it. */
export function writeConsentCookie(serialized: string): void {
  if (typeof document === "undefined") return;
  const maxAge = 365 * 24 * 60 * 60;
  document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(serialized)}; max-age=${maxAge}; path=/; SameSite=Lax`;
}
