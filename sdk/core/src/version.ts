/**
 * The version of `@cookieyes/core` this build was produced from.
 *
 * The literal below is a **sentinel, replaced at build time** with the real
 * version from `package.json` (see the `injectPkgVersion` plugin in
 * `rollup.shared.mjs`). It is done that way rather than hand-maintained because
 * Changesets bumps `package.json` on the release PR — a constant someone has to
 * remember to update would go stale on exactly the commit that matters, and a
 * test guarding it would block an automated release PR instead.
 *
 * Reading this from source (this repo's own tests, or a `workspace:*` link)
 * leaves the sentinel in place. Treat `0.0.0-dev` as "unknown version", never as
 * a real one — `@cookieyes/test` does exactly that before deciding whether to
 * warn about a mismatched pair.
 */
export const CORE_VERSION = "0.0.0-dev";
