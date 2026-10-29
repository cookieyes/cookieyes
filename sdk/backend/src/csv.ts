import { RECORD_FIELDS } from "./contract.js";
import type { StoredRecord } from "./store.js";

function cell(value: StoredRecord[keyof StoredRecord]): string {
  const text = value === null ? "" : Array.isArray(value) ? value.join(",") : String(value);
  // A leading = + - @ makes a spreadsheet run the cell as a formula; the apostrophe
  // keeps it text. Values come from visitors' browsers, so this matters.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Records as CSV with a header row, one decision per line, in `RECORD_FIELDS` order. */
export function recordsToCsv(records: readonly StoredRecord[]): string {
  const lines = [RECORD_FIELDS.map((f) => f.column).join(",")];
  for (const record of records)
    lines.push(RECORD_FIELDS.map((f) => cell(record[f.name])).join(","));
  return `${lines.join("\r\n")}\r\n`;
}
