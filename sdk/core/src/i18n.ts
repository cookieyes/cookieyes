import { en } from "./translations/en.js";
import type { I18nConfig, TranslationMap } from "./types.js";

export { en as defaultTranslations };

export function resolveTranslations(i18n?: I18nConfig): TranslationMap {
  const messages = i18n?.messages ?? {};
  const detect = i18n?.detectBrowserLanguage ?? true;

  const candidates: string[] = [];
  if (i18n?.locale) candidates.push(i18n.locale);
  if (detect && typeof navigator !== "undefined" && navigator.language) {
    candidates.push(navigator.language);
  }

  for (const tag of candidates) {
    const primary = tag.split("-")[0]?.toLowerCase() ?? "";
    const hit = messages[tag] ?? (primary ? messages[primary] : undefined);
    if (hit) return hit;
  }
  return messages.en ?? en;
}
