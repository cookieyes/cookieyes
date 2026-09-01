/**
 * Shared shapes for the generated configuration reference.
 *
 * `SidecarEntry` is authored by hand in
 * `content/docs/getting-started/configuration.sidecar.ts` — it supplies the
 * four things the TypeScript compiler cannot: a plain-language description, a
 * default value + where it's applied, the actual if-omitted behaviour, and
 * the AC 1.5 group. `MergedOption` is what `scripts/generate-config-reference.mjs`
 * writes into `.generated/config-reference.json` after joining every sidecar
 * entry against the structural facts (type, required, branch) it extracted
 * from `CookieYesConfig` via the TypeScript compiler API.
 *
 * Importing this file from both the sidecar and the generator means a
 * malformed sidecar entry is a red squiggle in the editor, not just a build
 * failure. See ai-context/designs/config-reference-page.md §2.1 and §5.
 */

/** The five AC 1.5 groups every top-level option is sorted into. */
export type ConfigGroupId = "setup" | "appearance" | "language" | "storage" | "callbacks";

/** The four nested config objects that get their own `<ConfigNestedTable>`. */
export type NestedConfigPath = "theme" | "region" | "i18n" | "networkBlocker";

export type SidecarEntry = {
  /** e.g. `"mode"`, `"theme.primaryColor"`, `"region.honorGpc"`. */
  path: string;
  group: ConfigGroupId;
  description: string;
  /** Display string, e.g. `"DEFAULT"`, `"true"`, `"system stack"`. `null` = no default. */
  default: string | null;
  /** `"core/runtime.ts:69"` — file:line where the default is applied. Required whenever `default` is non-null. */
  defaultLocation: string | null;
  /** The actual behaviour when this option is left out — never the word "optional". */
  ifOmitted: string;
  /** Present only for deprecated entries (`overrides`, `backendURL`, `builtInIntegrations`). Names the replacement path. */
  deprecatedReplacement?: string | undefined;
};

export type MergedOption = SidecarEntry & {
  /** From the compiler, e.g. `'"cookie-only" | "self-hosted"'`. */
  type: string;
  required: boolean;
  /** Structural fact from walking the `CookieYesConfig` union: is this field on every branch, or only `self-hosted`? */
  branch: "common" | "self-hosted-only";
};

export type ConfigReferenceData = {
  groups: Record<ConfigGroupId, MergedOption[]>;
  nested: Record<NestedConfigPath, MergedOption[]>;
};
