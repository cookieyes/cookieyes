import { en } from "./translations/en.js";
import type { I18nConfig, PartialTranslations, TextDirection, TranslationMap } from "./types.js";

export { en as defaultTranslations };

// Languages written right-to-left, by primary subtag. Everything else is ltr.
const RTL = new Set(["ar", "he", "fa", "ur", "ps", "sd", "yi", "dv"]);

/** The base subtag of a language tag, lowercased: "en-GB" → "en". */
export function primaryOf(tag: string): string {
  return tag.split("-")[0]?.toLowerCase() ?? "";
}

/** Reading direction for a language tag, e.g. "ar" or "ar-EG" → "rtl". */
export function getTextDirection(tag: string): TextDirection {
  return RTL.has(primaryOf(tag)) ? "rtl" : "ltr";
}

/** Deep-merge a (possibly partial) override onto a complete base map. */
export function mergeTranslations(
  base: TranslationMap,
  override?: PartialTranslations,
): TranslationMap {
  if (!override) return base;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value == null) continue;
    const baseVal = (base as Record<string, unknown>)[key];
    const bothObjects =
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof baseVal === "object" &&
      baseVal != null;
    out[key] = bothObjects
      ? mergeTranslations(baseVal as TranslationMap, value as PartialTranslations)
      : value;
  }
  return out as TranslationMap;
}

/**
 * The language to start in, resolved in order: explicit `locale`, then the
 * browser's language, then English. Only returns one we actually have text for
 * (others can be brought in later via `loadLanguage`).
 */
export function pickLanguage(i18n?: I18nConfig): string {
  const messages = i18n?.messages ?? {};
  const candidates: string[] = [];
  if (i18n?.locale) candidates.push(i18n.locale);
  if (
    (i18n?.detectBrowserLanguage ?? true) &&
    typeof navigator !== "undefined" &&
    navigator.language
  ) {
    candidates.push(navigator.language);
  }
  for (const tag of candidates) {
    if (messages[tag]) return tag;
    const primary = primaryOf(tag);
    if (primary && messages[primary]) return primary;
  }
  return "en";
}

/** Full translations for the resolved starting language, English filling any gaps. */
export function resolveTranslations(i18n?: I18nConfig): TranslationMap {
  const messages = i18n?.messages ?? {};
  const tag = pickLanguage(i18n);
  return mergeTranslations(en, messages[tag] ?? messages[primaryOf(tag)]);
}
