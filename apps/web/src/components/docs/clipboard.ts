/**
 * Writes `text` to the clipboard, falling back to the classic
 * `document.execCommand("copy")` textarea trick when the async Clipboard API is
 * unavailable (e.g. non-secure contexts) — mirrors docs.html:2069-2078's fallback.
 *
 * Shared by PmSplit (the page-level "Copy as Markdown" split button) and
 * CodeTabsCopy (the per-tabbed-code-block "Copy" control) — both need the exact same
 * fallback behaviour, so it lives here once rather than twice.
 */
export async function writeToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}
