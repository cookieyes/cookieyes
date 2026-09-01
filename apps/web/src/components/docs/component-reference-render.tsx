import type { TypeNode } from "fumadocs-ui/components/type-table";
import type { MergedComponentOption } from "@/lib/component-reference-types";

/**
 * Turns one generated `MergedComponentOption` into a `TypeTable` `TypeNode`.
 * Its own file, not a generalization of `config-reference-render.tsx`'s
 * `toTypeNode`/`toTypeMap` pair — `MergedOption` carries a `branch: "common" |
 * "self-hosted-only"` field with no component equivalent, so the two
 * `TypeNode` builders would immediately diverge; keeping them separate is
 * less code than parameterizing one for a difference that exists in exactly
 * one field. See ai-context/designs/component-reference-docs.md §2.6.
 */
export function toComponentTypeNode(option: MergedComponentOption): TypeNode {
  return {
    type: option.type,
    required: option.required,
    default: option.default ?? undefined,
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

export function toComponentTypeMap(options: MergedComponentOption[]): Record<string, TypeNode> {
  return Object.fromEntries(options.map((option) => [option.path, toComponentTypeNode(option)]));
}
