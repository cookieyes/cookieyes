const DOCS_URL = "https://github.com/cookieyes/cookieyes#compatibility";
const warned = new Set<string>();

/**
 * Newest Svelte major this SDK's CI matrix has verified. Kept in sync with the peer matrix by a
 * test that fails when this constant and the matrix's highest pinned Svelte major disagree.
 */
const HIGHEST_VERIFIED_SVELTE_MAJOR = 5;

/**
 * Dev-only: warns once per unique Svelte major when the running Svelte is newer than the newest
 * major the CI matrix has exercised, or older than the one this SDK is written for.
 *
 * Only the major can be read, and only from `globalThis.__svelte.v`, a set of the majors that
 * Svelte's runtime registers. The exact version lives in `svelte/compiler`, which would pull the
 * compiler into a dev browser session. A version below the declared floor cannot reach here at
 * all: the components use `$props.id()`, which an older compiler refuses to build.
 *
 * The `typeof process === "undefined"` half of the guard matters: this SDK also ships to
 * consumers with no bundler define step for `process.env`, where the check itself would throw.
 */
export function warnOnUntestedSvelteVersion(): void {
  if (typeof process === "undefined" || process.env?.NODE_ENV === "production") return;
  if (typeof console === "undefined") return;
  const registered = (globalThis as { __svelte?: { v?: Iterable<unknown> } }).__svelte?.v;
  if (!registered) return;
  for (const entry of registered) {
    const major = Number.parseInt(String(entry), 10);
    if (!Number.isFinite(major)) continue;
    const tooOld = major < HIGHEST_VERIFIED_SVELTE_MAJOR;
    const tooNew = major > HIGHEST_VERIFIED_SVELTE_MAJOR;
    if (!tooOld && !tooNew) continue;
    const key = String(major);
    if (warned.has(key)) continue;
    warned.add(key);
    console.warn(
      tooOld
        ? `[cookieyes] You're running Svelte ${major}, which is older than the Svelte ` +
            `${HIGHEST_VERIFIED_SVELTE_MAJOR} this SDK supports (svelte >=5.20.0). This ` +
            `combination is not tested and parts of the SDK may fail silently rather than ` +
            `error. See ${DOCS_URL} for the tested matrix.`
        : `[cookieyes] You're running Svelte ${major}. This SDK's CI matrix has verified up ` +
            `through Svelte ${HIGHEST_VERIFIED_SVELTE_MAJOR}.x. Newer majors likely work but ` +
            `haven't been verified yet. See ${DOCS_URL} for the tested matrix.`,
    );
  }
}

declare const process: { env?: { NODE_ENV?: string } };
