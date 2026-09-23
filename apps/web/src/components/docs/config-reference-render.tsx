import type { TypeNode } from "fumadocs-ui/components/type-table";
import type { MergedOption } from "@/lib/config-reference-types";

/**
 * Turns one generated `MergedOption` into a `TypeTable` `TypeNode`. Only the description
 * is shown: the Default column already says what an omitted option does, and the
 * sidecar's longer `ifOmitted` prose stays available for the checks without lengthening
 * the table. Shared by `ConfigOptionsTable` and `ConfigNestedTable`.
 */
export function toTypeNode(option: MergedOption): TypeNode {
  return {
    type: option.type,
    required: option.required,
    default: option.default ?? undefined,
    deprecated: option.deprecatedReplacement !== undefined,
    description: option.description,
  };
}

/**
 * Deprecated options (`overrides`, `backendURL`, `builtInIntegrations`) stay in the generated
 * data so the fail-closed checks keep covering them, but the docs are written for new
 * setups and never show them.
 */
export function toTypeMap(options: MergedOption[]): Record<string, TypeNode> {
  return Object.fromEntries(
    options
      .filter((option) => option.deprecatedReplacement === undefined)
      .map((option) => [option.path, toTypeNode(option)]),
  );
}
