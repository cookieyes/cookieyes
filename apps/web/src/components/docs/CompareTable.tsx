import type { ReactNode } from "react";

type MarkKind = "yes" | "no" | "partial";

const MARK_GLYPH: Record<MarkKind, string> = {
  yes: "✓",
  no: "✕",
  partial: "~",
};

const MARK_LABEL: Record<MarkKind, string> = {
  yes: "Supported",
  no: "Not supported",
  partial: "Partial support",
};

/**
 * Support marker for a comparison cell. The glyph is decorative and the meaning is
 * carried by visually-hidden text, so the table does not rely on colour or symbol
 * shape alone to distinguish supported from unsupported.
 */
export function Mark({ is }: { is: MarkKind }) {
  return (
    <span className="cy-doc-cmp-mark" data-mark={is}>
      <span aria-hidden="true">{MARK_GLYPH[is]}</span>
      <span className="sr-only">{MARK_LABEL[is]}</span>
    </span>
  );
}

interface CompareColumn {
  /** Stable identifier, also the key each row's cells are looked up by. */
  id: string;
  /** Column heading. */
  label: ReactNode;
  /** Tints the heading in the accent colour — use for the CookieYes column. */
  highlight?: boolean;
}

interface CompareRow {
  /** Stable identifier for the row. */
  id: string;
  /** Row label, rendered as the row header. */
  label: ReactNode;
  /** Cells keyed by column id. A column with no entry renders an empty cell. */
  cells: Record<string, ReactNode>;
}

interface CompareTableProps {
  /** Heading for the leftmost (row-label) column. */
  feature: ReactNode;
  columns: CompareColumn[];
  rows: CompareRow[];
}

/**
 * Feature comparison grid from the Compare page. Cells are keyed by column id
 * rather than by position, so adding a column cannot silently shift a row's
 * answers. Wrapped in its own scroll container so a wide table scrolls itself
 * instead of the page body.
 */
export function CompareTable({ feature, columns, rows }: CompareTableProps) {
  return (
    <div className="cy-doc-cmp-scroll">
      <table className="cy-doc-cmp">
        <thead>
          <tr>
            <th scope="col">{feature}</th>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                data-highlight={column.highlight ? "true" : undefined}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">{row.label}</th>
              {columns.map((column) => (
                <td key={column.id}>{row.cells[column.id]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
