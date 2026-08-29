import type { TypeNode } from "fumadocs-ui/components/type-table";
import { ParamFlag } from "./ParamFlag";

export interface PropsTableProps {
  /**
   * Keyed by option/prop path — the exact shape every render helper in this directory
   * already produces: `toTypeMap` (config-reference-render.tsx), `toComponentTypeMap`
   * (component-reference-render.tsx), and `CssVariableReferenceTable`'s own local
   * `toTypeNode`. Reusing Fumadocs' `TypeNode` as the data interface here means none of
   * those helpers had to change.
   */
  type: Record<string, TypeNode>;
}

/**
 * Real `<table class="cy-doc-table">`, standing in for Fumadocs' `TypeTable`. `TypeTable`
 * emits no table semantics at all — flex divs sized with `w-1/4`, inside a rounded
 * `bg-fd-card` disclosure card — so it could never match the design's bordered grid
 * (docs.html:248-250) by construction, only by increasingly specific CSS overrides.
 * `.cy-doc-table` already matches that grid; this only needs to give it real `<table>`
 * markup to attach to.
 *
 * Columns are fixed (Name / Type / Default / Description) rather than configurable —
 * every current caller wants exactly these four, and `TypeNode` doesn't carry enough
 * to justify more.
 */
export function PropsTable({ type }: PropsTableProps) {
  return (
    <div className="cy-doc-table-scroll">
      <table className="cy-doc-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Type</th>
            <th scope="col">Default</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(type).map(([name, node]) => (
            <tr key={name}>
              <td>
                <code data-deprecated={node.deprecated ? "true" : undefined}>{name}</code>
                <ParamFlag required={node.required ?? false} />
              </td>
              <td>
                <code>{node.type}</code>
              </td>
              <td>
                {node.default !== undefined && node.default !== null ? (
                  <code>{node.default}</code>
                ) : (
                  "—"
                )}
              </td>
              <td>{node.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
