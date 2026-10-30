import type { ReactNode } from "react";

/**
 * Sidecar and generated prose marks code with backticks, as markdown would. The
 * reference tables render that prose as plain text, which showed the backticks to
 * the reader; this turns each `span` into a `<code>` element instead.
 */
export function inlineCode(text: string): ReactNode {
  return text.split(/`([^`]+)`/).map((part, i) =>
    // Odd indexes are the captured code spans.
    // biome-ignore lint/suspicious/noArrayIndexKey: the split is fixed for a given string, so the index is stable.
    i % 2 === 1 ? <code key={i}>{part}</code> : part,
  );
}
