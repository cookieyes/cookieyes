/**
 * Shared shapes for the generated component-props reference.
 *
 * Mirrors `config-reference-types.ts`: `ComponentSidecarEntry` is authored by
 * hand in `content/docs/components/component-props.sidecar.ts` — it supplies
 * the things the TypeScript compiler cannot: a plain-language description, a
 * default value + where it's applied, and the actual if-omitted behaviour.
 * `MergedComponentOption` is what `scripts/generate-component-reference.mjs`
 * writes into `.generated/component-reference.json` after joining every
 * sidecar entry against the structural facts (type, required) it extracted
 * from each component's `*Props` type via the TypeScript compiler API.
 *
 * Importing this file from both the sidecar and the generator means a
 * malformed sidecar entry is a red squiggle in the editor, not just a build
 * failure. See ai-context/designs/component-reference-docs.md §2.2 and §8.
 */

/**
 * The six components whose props are generated from code. `ReloadNotice` is
 * deliberately excluded — it takes no props at all (see design §2.4).
 */
export type ComponentName =
  | "CookieBanner"
  | "CookiePreferences"
  | "CookieOptOut"
  | "RecallButton"
  | "GatedScript"
  | "GatedFrame";

export type ComponentSidecarEntry = {
  component: ComponentName;
  /** e.g. `"className"`, `"classNames"`, `"onLoad"`, `"...rest"`. */
  path: string;
  description: string;
  /** Display string, e.g. `"cy-widget"`, `"true"`. `null` = no default. */
  default: string | null;
  /** `"package/path/file.tsx:line"` — where the default is applied. Required whenever `default` is non-null. */
  defaultLocation: string | null;
  /** The actual behaviour when this prop is left out — never the word "optional". */
  ifOmitted: string;
};

export type MergedComponentOption = ComponentSidecarEntry & {
  /** From the compiler, e.g. `'Partial<Record<BannerPart, string>>'`. */
  type: string;
  required: boolean;
};

export type ComponentReferenceData = {
  components: Record<ComponentName, MergedComponentOption[]>;
};
