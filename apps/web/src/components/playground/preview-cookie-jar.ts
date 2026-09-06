/**
 * An in-memory stand-in for `document.cookie`, installed in the preview frame only.
 *
 * The preview is a demo, not a decision. `@cookieyes/core` writes `cookieyes-consent`
 * at `path=/` on this origin and neither the name nor the scope is configurable, so
 * without this a visitor clicking "Accept all" in a sandbox would leave a real consent
 * record for the whole site — and the site's own banner would later read it as a genuine
 * choice. Clearing the cookie instead would be worse: that deletes a record the visitor
 * actually gave.
 *
 * Isolating the frame with `sandbox` (no `allow-same-origin`) would achieve the same
 * thing for free, but `writeConsentCookie` assigns `document.cookie` unguarded and an
 * opaque origin makes that throw. Revisit if the SDK ever guards it.
 *
 * Only the subset the SDK uses is emulated: set a name, read them back, and treat
 * `max-age=0` as a delete.
 */

const jar = new Map<string, string>();

function serialise(): string {
  return Array.from(jar, ([name, value]) => `${name}=${value}`).join("; ");
}

function apply(entry: string): void {
  const [pair = "", ...attributes] = entry.split(";");
  const separator = pair.indexOf("=");
  if (separator === -1) return;

  const name = pair.slice(0, separator).trim();
  if (!name) return;

  if (attributes.some((attribute) => /^\s*max-age\s*=\s*0\s*$/i.test(attribute))) {
    jar.delete(name);
    return;
  }
  jar.set(name, pair.slice(separator + 1).trim());
}

/**
 * Call before anything touches the SDK. Runs at module scope in the preview so no effect
 * ordering can put a consent write ahead of it.
 */
export function installEphemeralCookieJar(): void {
  if (typeof document === "undefined") return;
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get: serialise,
    set: apply,
  });
}

/** Forget every stored choice, so the next mount looks like a first visit. */
export function clearEphemeralCookieJar(): void {
  jar.clear();
}
