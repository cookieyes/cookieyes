---
"@cookieyes/core": minor
"@cookieyes/react": minor
"@cookieyes/nextjs": minor
---

Translations for custom UIs, with live language switching.

- `useTranslations()` now re-renders when the language changes (previously fixed at setup).
- New `useLanguage()` hook: read the active language, its reading direction (`ltr`/`rtl`), the loaded languages, and switch language live with `setLanguage(tag)` — no page reload.
- Languages in `i18n.messages` can be **partial**; any missing text falls back to English.
- New `i18n.loadLanguage(tag)` to load a language on demand (import it or fetch from your own URL) instead of bundling every language upfront.
- Core helpers `mergeTranslations`, `getTextDirection`, `pickLanguage` are exported for non-React use.

The starting language is resolved per page load (explicit `locale` → browser → English); the visitor's choice isn't persisted by the SDK.
