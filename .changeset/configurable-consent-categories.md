---
"@cookieyes/core": minor
"@cookieyes/react": minor
"@cookieyes/nextjs": minor
---

Make consent categories configurable, and broadcast Google Consent Mode v2 automatically.

**Configurable categories.** Define your own taxonomy instead of the built-in
five via `categories` (core config / `getOrCreateConsentRuntime`) or
`.categories([...])` (React builder). Each `CategoryDef` has a stable `id`, an
explicit `required` flag (the always-on category is marked here, never inferred
from the name `necessary`, so you can rename it freely), optional
`label`/`description`, and an optional `gcm` mapping. Omit `categories` entirely
and you get the built-in five, unchanged. Invalid config (empty, duplicate ids,
ids containing `,`/`:` or colliding with reserved cookie keys, or no `required`
category) logs a warning and safely falls back to the five. The preferences UI
now renders whatever taxonomy is in effect.

**Upgrade-safe taxonomy changes.** Consent records are stamped with a taxonomy
signature (`taxonomyHash` on the snapshot, `tax:` in the cookie). A returning
visitor's consent is reused while the signature is unchanged; if you change the
taxonomy the SDK **re-requests** consent rather than silently applying a
mismatched record. Legacy cookies with no stamp are honoured as the built-in
five, so upgrading the SDK never resets existing visitors.

**Google Consent Mode v2 broadcast.** When a `dataLayer` is present, the SDK now
broadcasts all seven Consent Mode signals — on load and on every consent change,
for every visitor — derived from each category's `gcm` mapping. Google Analytics
4 and Google Tag Manager are governed by this automatically and **no longer need
an `integrations` entry** — the `ga4` and `gtm` built-in integrations have been
removed (use the automatic broadcast; set your deny-by-default state in your
gtag snippet as before). `meta` and the reload-only vendors are unchanged.

New exports: `resolveCategories`, `DEFAULT_CATEGORIES`, `broadcastGoogleConsent`,
`computeGoogleConsent`, types `CategoryDef` / `ResolvedCategories` /
`GoogleConsentSignal` (core, re-exported from React), and the `useCategories()`
hook (React). The core README documents configurable categories and Consent Mode
v2 mapping.
