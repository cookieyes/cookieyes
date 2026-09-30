"use client";

/**
 * Save a value as a pretty-printed `.json` file via a temporary object URL.
 * Best-effort, like `copyJson`: returns `false` instead of throwing when the
 * browser can't create the download.
 */
export function downloadJson(filename: string, value: unknown): boolean {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") return false;
  try {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return true;
  } catch {
    return false;
  }
}

/** `cookieyes-debug-2026-09-29T11-20-05.json` — sortable, filesystem-safe. */
export function timestampedFilename(prefix: string, now = new Date()): string {
  return `${prefix}-${now.toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
}
