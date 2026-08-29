import type { SidecarEntry } from "@/lib/config-reference-types";

/**
 * Hand-maintained, type-checked prose data for every `CookieYesConfig` option
 * (and the direct fields of its four nested objects: `theme`, `region`,
 * `i18n`, `networkBlocker`).
 *
 * `scripts/generate-config-reference.mjs` extracts the *structural* facts
 * (name, type, required, branch) from `sdk/core/src/types.ts` via the
 * TypeScript compiler API and joins them against this file by `path`. The
 * generator fails the build if a path here has no match in the compiler's
 * extraction (stale entry — e.g. a field that was removed from the SDK) or if
 * the compiler finds a path with no entry here (undocumented field). See
 * ai-context/designs/config-reference-page.md §2.1.
 *
 * `defaultLocation` is required whenever `default` is non-null, and should be
 * a `package/path/file.ts:line` pointing at the exact line the default is
 * *applied* (not just declared) — see the individual entries below for the
 * verified locations.
 */
export const configSidecarEntries: SidecarEntry[] = [
  // ── Setup ──────────────────────────────────────────────────────────────
  {
    path: "mode",
    group: "setup",
    description:
      "Which storage/consent-delivery mode to use: cookie-only (client-side only, zero network requests) or self-hosted (also persists every decision to your backend).",
    default: null,
    defaultLocation: null,
    ifOmitted:
      "Required. Omitting it is a compile-time type error — there is no default and no runtime fallback.",
  },
  {
    path: "regulation",
    group: "setup",
    description:
      "Which privacy regulation applies (GDPR, CCPA, or DEFAULT). A manual value here always wins over region detection.",
    default: '"DEFAULT"',
    defaultLocation: "core/runtime.ts:69 (also react/runtime.ts:291)",
    ifOmitted:
      'Defaults to "DEFAULT" — a generic regulation profile that is neither GDPR-strict nor CCPA-specific. If `region` is also configured, its detected regulation is used instead; with neither set, every visitor sees the DEFAULT banner regardless of where they are.',
  },
  {
    path: "region",
    group: "setup",
    description:
      "Optional geo-detection: choose the active regulation from the visitor's region instead of hardcoding one.",
    default: null,
    defaultLocation: null,
    ifOmitted:
      "No geo-detection runs. The active regulation is whatever `regulation` resolves to (default \"DEFAULT\") for every visitor, regardless of where they actually are.",
  },
  {
    path: "overrides",
    group: "setup",
    description:
      "Deprecated nested alias for the top-level `regulation` — `{ overrides: { regulation } }` still works and maps onto it.",
    default: null,
    defaultLocation: null,
    ifOmitted:
      "Nothing — omitting it is the recommended state. If both `overrides.regulation` and the top-level `regulation` are set, the top-level one wins.",
    deprecatedReplacement: "regulation",
  },

  // ── Appearance ─────────────────────────────────────────────────────────
  {
    path: "colorScheme",
    group: "appearance",
    description: "Light, dark, or follow-the-OS theme mode for the banner and preferences dialog.",
    default: '"system"',
    defaultLocation: "react/runtime.ts:373",
    ifOmitted:
      'Defaults to "system" — the banner follows the OS/browser color scheme. Only read by `@cookieyes/react`: in `@cookieyes/core` alone (no React layer), `colorScheme` has no effect at all.',
  },
  {
    path: "theme",
    group: "appearance",
    description:
      "Colors, corner radius, and font family for the banner and preferences dialog. See the table below for each field's own default.",
    default: null,
    defaultLocation: null,
    ifOmitted:
      "Every theme field falls back to its own default (see the theme table below) — the default CookieYes blue-on-white palette is used. Like `colorScheme`, `theme` is only read by `@cookieyes/react`; it is inert in `@cookieyes/core` alone.",
  },

  // ── Language ───────────────────────────────────────────────────────────
  {
    path: "i18n",
    group: "language",
    description: "Translations, active locale, and on-demand language loading.",
    default: null,
    defaultLocation: null,
    ifOmitted:
      "English-only, with browser-language auto-detection still on by default (see `i18n.detectBrowserLanguage` below) — there just aren't any extra `messages` for it to detect into, so every visitor sees English.",
  },

  // ── Storage & consent data ─────────────────────────────────────────────
  {
    path: "categories",
    group: "storage",
    description:
      "Your own consent-category taxonomy. Omit to get the built-in five (necessary, functional, analytics, performance, advertisement) unchanged.",
    default: "built-in five",
    defaultLocation: "core/categories.ts:121-122",
    ifOmitted:
      "Uses the built-in five categories unchanged: necessary, functional, analytics, performance, advertisement (with `necessary` marked required).",
  },
  {
    path: "networkBlocker",
    group: "storage",
    description:
      "Block matching third-party network requests (fetch/XHR/sendBeacon) by category until consent is granted.",
    default: null,
    defaultLocation: null,
    ifOmitted:
      "No requests are blocked. Every network call fires regardless of consent state — network blocking is opt-in, not a default protection.",
  },
  {
    path: "googleConsentMatch",
    group: "storage",
    description:
      'How to combine multiple categories that map to the same Google Consent Mode signal: "any" grants the signal if any mapped category is granted; "all" requires every mapped category.',
    default: '"any"',
    defaultLocation: "core/manager.ts:36",
    ifOmitted:
      'Defaults to "any" — a Google Consent Mode signal is granted the moment any category mapped to it is granted. Only matters for a custom taxonomy where more than one category maps to the same signal.',
  },
  {
    path: "apiUrl",
    group: "storage",
    description: "Endpoint the ConsentPayload is POSTed to, under `mode: \"self-hosted\"`.",
    default: null,
    defaultLocation: null,
    ifOmitted:
      'With neither `apiUrl` nor `backend` set under `mode: "self-hosted"`: `@cookieyes/react` throws at init (react/runtime.ts:279–283); `@cookieyes/core` used alone fails silently — consent decisions are kept in the cookie but never leave the browser, with no error and no warning.',
  },
  {
    path: "apiKey",
    group: "storage",
    description: 'Sent as an `Authorization: Bearer <apiKey>` header on the `apiUrl` POST, if set.',
    default: null,
    defaultLocation: null,
    ifOmitted: "No Authorization header is sent — the POST to `apiUrl` goes out unauthenticated.",
  },
  {
    path: "backend",
    group: "storage",
    description:
      "Custom persistence adapter (`persist(payload)`) — full control over transport, headers, batching, retries, or a non-HTTP destination.",
    default: null,
    defaultLocation: null,
    ifOmitted:
      'Same as omitting `apiUrl` — see its entry above. If both `apiUrl` and `backend` are unset under `mode: "self-hosted"`, there is no working persistence.',
  },
  {
    path: "backendURL",
    group: "storage",
    description: "Deprecated alias for `apiUrl` — still works and maps onto it.",
    default: null,
    defaultLocation: null,
    ifOmitted:
      "Nothing — omitting it is the recommended state. If both `backendURL` and `apiUrl` are set, `apiUrl` wins.",
    deprecatedReplacement: "apiUrl",
  },

  // ── Callbacks & integrations ───────────────────────────────────────────
  {
    path: "integrations",
    group: "callbacks",
    description:
      "Ready-made, consent-gated third-party integrations (Segment, Meta, Google, more) built from a preset in `@cookieyes/scripts`.",
    default: null,
    defaultLocation: null,
    ifOmitted:
      "No third-party integrations are gated automatically. Anything you load yourself keeps running until you wire it up via `customStopHandlers` or your own code.",
  },
  {
    path: "builtInIntegrations",
    group: "callbacks",
    description:
      'Deprecated. Built-in stop-handlers for a few first-party vendors (e.g. `{ vendor: "meta" }"`), stopped cleanly when their category is revoked.',
    default: null,
    defaultLocation: null,
    ifOmitted:
      "Nothing — omitting it is the recommended state. Prefer the new `integrations` field with a preset from `@cookieyes/scripts`.",
    deprecatedReplacement: "integrations",
  },
  {
    path: "customStopHandlers",
    group: "callbacks",
    description:
      "Your own scripts' stop instructions, for anything without a built-in integration or preset.",
    default: null,
    defaultLocation: null,
    ifOmitted:
      "No custom stop handlers run on revoke. Anything not covered by `integrations`/`builtInIntegrations` keeps running until the visitor reloads the page.",
  },
  {
    path: "onConsentReady",
    group: "callbacks",
    description:
      "Low-level: fires once, after the runtime's initial consent state is known. For ongoing updates, use `consentStore.on(\"save\"|\"change\")` (core) or `useOnConsentChange` (react) instead.",
    default: null,
    defaultLocation: null,
    ifOmitted:
      "No one-shot startup callback fires. Nothing runs automatically when the initial consent state becomes known.",
  },
  {
    path: "onConsentUpdate",
    group: "callbacks",
    description:
      "Low-level: fires on every saved consent change, for the lifetime of this config. Cannot be unsubscribed — for that, use `consentStore.on()`/`useOnConsentChange` instead.",
    default: null,
    defaultLocation: null,
    ifOmitted:
      "No callback fires on saved consent changes. Nothing outside the SDK's own reactive store is notified when a visitor saves a decision.",
  },
  {
    path: "reloadOnRevoke",
    group: "callbacks",
    description: "Force a full page reload when consent is revoked, instead of relying on clean runtime stops.",
    default: "false",
    defaultLocation: "core/config.ts (implicit — falsy default, no explicit assignment)",
    ifOmitted:
      "Defaults to false. Revoking a category never force-reloads the page; the reload notice (if a stopped script has no clean runtime stop) is shown instead and the visitor decides.",
  },

  // ── theme.* (nested) ───────────────────────────────────────────────────
  {
    path: "theme.primaryColor",
    group: "appearance",
    description: "Primary button and accent color.",
    default: '"#1863dc"',
    defaultLocation: "react/styles/tokens.ts:47",
    ifOmitted: 'Falls back to "#1863dc" — the default CookieYes blue, in both light and dark.',
  },
  {
    path: "theme.backgroundColor",
    group: "appearance",
    description: "Surface background for the banner and preferences dialog.",
    default: '"#ffffff"',
    defaultLocation: "react/styles/tokens.ts:49",
    ifOmitted: 'Falls back to "#ffffff" in light mode; overridden to "#161B27" in dark mode (react/styles/tokens.ts:31).',
  },
  {
    path: "theme.textColor",
    group: "appearance",
    description: "Body text color.",
    default: '"#212121"',
    defaultLocation: "react/styles/tokens.ts:50",
    ifOmitted: 'Falls back to "#212121" in light mode; overridden to "#F3F4F6" in dark mode (react/styles/tokens.ts:32).',
  },
  {
    path: "theme.mutedTextColor",
    group: "appearance",
    description: "Secondary/muted text color.",
    default: '"#6B7280"',
    defaultLocation: "react/styles/tokens.ts:51",
    ifOmitted: 'Falls back to "#6B7280" in light mode; overridden to "#9CA3AF" in dark mode (react/styles/tokens.ts:33).',
  },
  {
    path: "theme.borderColor",
    group: "appearance",
    description: "Border and divider color.",
    default: '"#f4f4f4"',
    defaultLocation: "react/styles/tokens.ts:52",
    ifOmitted: 'Falls back to "#f4f4f4" in light mode; overridden to "#2D3748" in dark mode (react/styles/tokens.ts:34).',
  },
  {
    path: "theme.borderRadius",
    group: "appearance",
    description: "Corner radius applied to the banner, dialog, and buttons.",
    default: '"6px"',
    defaultLocation: "react/styles/tokens.ts:54",
    ifOmitted: 'Falls back to "6px".',
  },
  {
    path: "theme.fontFamily",
    group: "appearance",
    description: "Font family for all CookieYes UI.",
    default: "system stack",
    defaultLocation: "react/styles/tokens.ts:55-57",
    ifOmitted:
      "Falls back to the system font stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif.",
  },
  {
    path: "theme.focusColor",
    group: "appearance",
    description: "Focus-ring color for interactive elements (buttons, toggle, checkbox).",
    default: '"var(--cy-primary)"',
    defaultLocation: "react/styles/tokens.ts (computeThemeVars, --cy-focus default)",
    ifOmitted:
      'Falls back to "var(--cy-primary)" — the focus ring matches your brand color, exactly as it did before this option existed.',
  },
  {
    path: "theme.widgetBackgroundColor",
    group: "appearance",
    description:
      "Background color of the floating recall widget (the small circular re-open button).",
    default: '"#0056a7"',
    defaultLocation: "react/styles/tokens.ts (computeThemeVars, --cy-widget-bg default)",
    ifOmitted:
      'Falls back to "#0056a7" in light mode. In dark mode a fixed override is used regardless of this value, the same way backgroundColor/textColor/mutedTextColor/borderColor already work.',
  },

  // ── region.* (nested) ──────────────────────────────────────────────────
  {
    path: "region.detect",
    group: "setup",
    description:
      "Return the visitor's region synchronously — e.g. from a hosting header you already have.",
    default: null,
    defaultLocation: null,
    ifOmitted:
      "No geo-detection. The region is never inferred; only the manual `regulation` (or its own default) applies.",
  },
  {
    path: "region.map",
    group: "setup",
    description:
      'Region → regulation mapping (your own). Matched most-specific first: "US-CA" is checked before "US".',
    default: null,
    defaultLocation: null,
    ifOmitted:
      "No mapping exists. A detected region alone cannot choose a regulation without a map — `strictest` is applied instead.",
  },
  {
    path: "region.honorGpc",
    group: "setup",
    description: "Honour the browser's Global Privacy Control \"do not sell/share\" signal (a CCPA opt-out).",
    default: "true",
    defaultLocation: "core/runtime.ts:31",
    ifOmitted:
      "Defaults to true — the browser's GPC signal is honoured automatically wherever `region` is configured.",
  },
  {
    path: "region.strictest",
    group: "setup",
    description: "Regulation to apply when the region is unknown or detection fails.",
    default: '"GDPR"',
    defaultLocation: "core/region.ts:65",
    ifOmitted:
      'Defaults to "GDPR" — the opt-in regime is the safe fallback when a visitor\'s region cannot be determined.',
  },
  {
    path: "region.debug",
    group: "setup",
    description: "Log the region decision to the console at setup, for local debugging.",
    default: "false",
    defaultLocation: "core/region.ts (implicit — falsy default, no explicit assignment)",
    ifOmitted: "Defaults to false — no region-decision logging in the console.",
  },

  // ── i18n.* (nested) ────────────────────────────────────────────────────
  {
    path: "i18n.messages",
    group: "language",
    description: "Translations per language. Each may be partial — missing text falls back to English.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No custom translations. Every language falls back entirely to the SDK's bundled English.",
  },
  {
    path: "i18n.locale",
    group: "language",
    description: "Force a specific active language instead of letting it be decided automatically.",
    default: null,
    defaultLocation: null,
    ifOmitted:
      "No forced locale. The active language is decided by `detectBrowserLanguage` (on by default) or falls back to English.",
  },
  {
    path: "i18n.detectBrowserLanguage",
    group: "language",
    description: "Automatically pick the active language from the visitor's browser.",
    default: "true",
    defaultLocation: "core/i18n.ts:51",
    ifOmitted:
      "Defaults to true — the visitor's browser language is auto-detected among the languages you've provided `messages` for (falls back to English if none match).",
  },
  {
    path: "i18n.loadLanguage",
    group: "language",
    description:
      "Called when a language is switched to that isn't already in `messages` — return its translations on demand instead of bundling them all upfront.",
    default: null,
    defaultLocation: null,
    ifOmitted:
      "Switching to a language not already in `messages` loads nothing extra — it renders whatever partial/fallback text is available (English for the rest) with no on-demand fetch.",
  },

  // ── networkBlocker.* (nested) ──────────────────────────────────────────
  {
    path: "networkBlocker.rules",
    group: "storage",
    description: "Which third-party requests to block, by domain/path/method, until their category is granted.",
    default: null,
    defaultLocation: null,
    ifOmitted:
      "Required whenever `networkBlocker` is provided — TypeScript rejects `networkBlocker: {}` without `rules`. An empty array is valid: the blocker installs but blocks nothing (`installNetworkBlocker` is a no-op when `!config.rules.length`, network-blocker.ts).",
  },
  {
    path: "networkBlocker.onRequestBlocked",
    group: "storage",
    description: "Called every time a request is blocked, in addition to the console warning.",
    default: null,
    defaultLocation: null,
    ifOmitted:
      "No app-level callback fires on a blocked request; only the console warning (if `logBlockedRequests` is on) surfaces it.",
  },
  {
    path: "networkBlocker.logBlockedRequests",
    group: "storage",
    description: "Log every blocked request to the console, for local debugging.",
    default: "true",
    defaultLocation: "core/network-blocker.ts:86",
    ifOmitted: "Defaults to true — every blocked request is logged via `console.warn`.",
  },
];
