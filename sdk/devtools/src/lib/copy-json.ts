"use client";

/**
 * Copy a value as pretty-printed JSON via the clipboard API. Best-effort: a
 * denied permission or an unavailable clipboard resolves to `false` rather
 * than throwing — this is a developer convenience, never load-bearing.
 */
export async function copyJson(value: unknown): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
    return true;
  } catch {
    return false;
  }
}

/** Copy plain text, with the same best-effort contract as {@link copyJson}. */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
