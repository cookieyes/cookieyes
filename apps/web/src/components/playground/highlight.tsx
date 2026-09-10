import type { ReactNode } from "react";

/**
 * Colours strings and comments; everything else stays plain.
 *
 * Those are the only two the design's editor distinguishes, and they are the two that
 * carry meaning here — the config is almost entirely string values. A real grammar would
 * be a lot more code for colours nobody is reading.
 */
const TOKEN = /("(?:[^"\\]|\\.)*")|(\/\/[^\n]*)/g;

export function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;

  TOKEN.lastIndex = 0;
  let match = TOKEN.exec(code);
  while (match !== null) {
    if (match.index > last) out.push(code.slice(last, match.index));
    const className = match[1] ? "cy-tok-str" : "cy-tok-com";
    out.push(
      <span className={className} key={`${className}-${key}`}>
        {match[0]}
      </span>,
    );
    key += 1;
    last = match.index + match[0].length;
    match = TOKEN.exec(code);
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}
