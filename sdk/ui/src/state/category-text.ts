import type { CategoryText } from "@cookieyes/core";

type MaybeText = { label?: string | undefined; description?: string | undefined } | undefined;

/** Where a category's label and description can come from, most specific first. */
export type CategoryTextSources = {
  /** The site's own translation for the active language, if it gave one. */
  translated?: MaybeText;
  /** The `label` and `description` in the category's configuration. */
  configured?: MaybeText;
  /** The built-in default for the active language. */
  defaults?: MaybeText;
};

/**
 * The text shown for a category: the site's translation for the active
 * language, then the configured text, then the built-in default, then the id.
 * The site's translation is kept apart from the built-in English so it can win
 * over the configured label without the English default masking it.
 */
export function categoryText(id: string, sources: CategoryTextSources): CategoryText {
  const { translated, configured, defaults } = sources;
  return {
    label: translated?.label ?? configured?.label ?? defaults?.label ?? id,
    description: translated?.description ?? configured?.description ?? defaults?.description ?? "",
  };
}
