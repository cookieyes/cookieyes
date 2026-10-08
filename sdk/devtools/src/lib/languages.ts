/**
 * The locales `@cookieyes/translations` ships, offered in the language picker
 * even when the site hasn't loaded them yet, so a developer can see what
 * adding one would look like. The `add-locale` guide lists this file, so a
 * new locale is added here too.
 */
export const TRANSLATION_LOCALES: readonly string[] = ["de", "en", "es", "fr", "it"];

/** Rough BCP 47 shape: "fr", "pt-BR", "zh-Hant-TW". */
const LANGUAGE_TAG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

/** Normalises typed text to a language tag, or `undefined` when it can't be one. */
export function toLanguageTag(query: string): string | undefined {
  const raw = query.trim();
  if (!raw) return undefined;
  const [primary = "", ...rest] = raw.split(/[-_]/);
  const tag = [primary.toLowerCase(), ...rest.map((p) => (p.length === 2 ? p.toUpperCase() : p))]
    .filter(Boolean)
    .join("-");
  return LANGUAGE_TAG.test(tag) ? tag : undefined;
}

const names = new Map<string, Intl.DisplayNames | null>();

function displayName(tag: string, inLocale: string): string | undefined {
  if (!names.has(inLocale)) {
    try {
      names.set(inLocale, new Intl.DisplayNames([inLocale], { type: "language" }));
    } catch {
      names.set(inLocale, null);
    }
  }
  try {
    const name = names.get(inLocale)?.of(tag);
    return name && name !== tag ? name : undefined;
  } catch {
    return undefined;
  }
}

/** "French", plus the language's own name when it differs: "French · français". */
export function languageLabel(tag: string): { label: string; native: string | undefined } {
  const english = displayName(tag, "en") ?? tag;
  const native = displayName(tag, tag);
  return { label: english, native: native && native !== english ? native : undefined };
}
