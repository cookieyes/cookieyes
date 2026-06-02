// Re-exports the type so customers can write helpers without an extra import.
//
// Locale tables intentionally are NOT re-exported here — pulling from the
// barrel ("@cookieyes/translations") would force every locale into the
// consumer's bundle. Use sub-path imports instead:
//
//   import { es } from "@cookieyes/translations/es";
//   import { fr } from "@cookieyes/translations/fr";
//
// Only the locales you actually import will end up in your build.
export type { TranslationMap } from "@cookieyes/core";
