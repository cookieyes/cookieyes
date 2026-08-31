import type { TypeNode } from "fumadocs-ui/components/type-table";
import type { MergedOption } from "@/lib/config-reference-types";

/**
 * Turns one generated `MergedOption` into a `TypeTable` `TypeNode`. `description`
 * is typed `ReactNode`, so composing the sidecar's if-omitted prose in as a
 * second paragraph is a supported use, not a hack — see design §2.2. Shared by
 * `ConfigOptionsTable` and `ConfigNestedTable`.
 */
export function toTypeNode(option: MergedOption): TypeNode {
  return {
    type: option.type,
    required: option.required,
    default: option.default ?? undefined,
    deprecated: option.deprecatedReplacement !== undefined,
    description: (
      <>
        <p>{option.description}</p>
        <p>
          <strong>If omitted:</strong> {option.ifOmitted}
        </p>
      </>
    ),
  };
}

export function toTypeMap(options: MergedOption[]): Record<string, TypeNode> {
  return Object.fromEntries(options.map((option) => [option.path, toTypeNode(option)]));
}
