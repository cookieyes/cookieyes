"use client";

import {
  defaultTranslations,
  getTextDirection,
  type I18nConfig,
  mergeTranslations,
  type PartialTranslations,
  pickLanguage,
  primaryOf,
  type TextDirection,
  type TranslationMap,
} from "@cookieyes/core";

/** Current language, its reading direction, and the languages currently loaded. */
export type LanguageInfo = {
  language: string;
  direction: TextDirection;
  languages: string[];
};

export type LanguageController = {
  /** Text for the active language (English fills any gaps). */
  getTranslations: () => TranslationMap;
  getLanguageInfo: () => LanguageInfo;
  /** Switch language live; loads via `i18n.loadLanguage` if not already present. */
  setLanguage: (tag: string) => Promise<void>;
};

/**
 * Owns the active language: which one is showing, its (English-filled) text,
 * and switching to another — loading it on demand when a loader is provided.
 * `onChange` runs after every switch so the UI can re-render.
 */
export function createLanguageController(
  i18n: I18nConfig | undefined,
  onChange: () => void,
): LanguageController {
  const messages: Record<string, PartialTranslations> = { ...i18n?.messages };
  const loadLanguage = i18n?.loadLanguage;
  const warned = new Set<string>();

  let language = pickLanguage(i18n);
  let translations = build(language);
  let info = buildInfo();

  function messagesFor(tag: string): PartialTranslations | undefined {
    return messages[tag] ?? messages[primaryOf(tag)];
  }
  // English is always available — it's the base every language merges onto,
  // so switching to it never needs a loader even when `messages` has no "en".
  function isAvailable(tag: string): boolean {
    return primaryOf(tag) === "en" || messagesFor(tag) !== undefined;
  }
  function build(tag: string): TranslationMap {
    return mergeTranslations(defaultTranslations, messagesFor(tag));
  }
  function buildInfo(): LanguageInfo {
    return {
      language,
      direction: getTextDirection(language),
      languages: Array.from(new Set(["en", ...Object.keys(messages)])),
    };
  }
  function apply(tag: string): void {
    language = tag;
    translations = build(tag);
    info = buildInfo();
    onChange();
  }
  function warnMissing(tag: string, err?: unknown): void {
    if (warned.has(tag) || typeof console === "undefined") return;
    warned.add(tag);
    // eslint-disable-next-line no-console
    console.warn(
      `[cookieyes] no translations for language "${tag}"; staying on "${language}". ` +
        "Add it to i18n.messages or provide i18n.loadLanguage.",
      err ?? "",
    );
  }
  function setLanguage(tag: string): Promise<void> {
    // Already have it (or it's English) → switch immediately.
    if (isAvailable(tag)) {
      apply(tag);
      return Promise.resolve();
    }
    // Otherwise ask the loader (keeps showing the current language until it lands).
    if (loadLanguage) {
      return Promise.resolve()
        .then(() => loadLanguage(tag))
        .then((loaded) => {
          messages[tag] = loaded;
          apply(tag);
        })
        .catch((err) => warnMissing(tag, err));
    }
    warnMissing(tag);
    return Promise.resolve();
  }

  // An explicit starting language that isn't bundled but has a loader: fetch it
  // now, so we honour the request (English shows until it lands). Browser-only —
  // never fire a load during server rendering.
  if (loadLanguage && i18n?.locale && !isAvailable(i18n.locale) && typeof window !== "undefined") {
    void setLanguage(i18n.locale);
  }

  return {
    getTranslations: () => translations,
    getLanguageInfo: () => info,
    setLanguage,
  };
}
