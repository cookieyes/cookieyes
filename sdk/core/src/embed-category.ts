import type { ResolvedCategories } from "./categories.js";
import type { CategoryText, TranslationMap } from "./types.js";

/** Declared locally and checked as a literal so bundlers strip the warning; see `deprecations.ts`. */
declare const process: { env: { NODE_ENV?: string } };

/**
 * The name to show for a category: the customer's translation for the active
 * language, then the label in the category config, then the built-in text,
 * then the id itself. Shared by `blockIframes` and React's `GatedFrame`.
 */
export function categoryLabel(
  category: string,
  translations: TranslationMap,
  categories: ResolvedCategories,
  customText: Partial<CategoryText> | undefined,
): string {
  return (
    customText?.label ??
    categories.list.find((def) => def.id === category)?.label ??
    translations.categories[category]?.label ??
    category
  );
}

const warnedCategories = new Set<string>();

/**
 * Warn, once per category, that an embed waits for a category that is not
 * configured and so can never load. No-op in a production bundle.
 */
export function warnUnknownEmbedCategory(category: string): void {
  if (process.env.NODE_ENV === "production") return;
  if (warnedCategories.has(category)) return;
  warnedCategories.add(category);
  console.warn(
    `[cookieyes] the embed category "${category}" is not one of your configured ` +
      "categories, so it will never load. Use an id from your categories.",
  );
}
