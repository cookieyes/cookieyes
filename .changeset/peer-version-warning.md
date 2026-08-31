---
"@cookieyes/react": minor
---

Dev-mode console warning when the installed React version is newer than anything this SDK's CI
peer-dependency matrix has verified.

In development builds only (`process.env.NODE_ENV !== "production"`), the SDK now warns once per
unique React version if `React.version`'s major is higher than the newest major the CI matrix has
tested — the SDK likely still works (it avoids version-specific APIs) but this hasn't been
verified yet. The warning is silent on any version the matrix already covers, including the
declared `>=18.0.0` floor (peerDependencies resolution at install time already enforces that).
Next.js version compatibility is intentionally not checked here — `@cookieyes/react` has no
dependency on `next`; the published compatibility table in the README is the source of truth for
that. No production behaviour change, no new public export — a new dev-only side effect at mount
time, same class of change as the existing contrast-warning changeset.
