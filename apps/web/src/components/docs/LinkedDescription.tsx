import type { ReactNode } from "react";

/**
 * Phrases that are always the same external reference wherever they appear in a page
 * description, paired with the URL the design points them at.
 *
 * The design hyperlinks these inside `.pd` (docs.html:1780). Our `.pd` is rendered from
 * `page.data.description`, which is a plain frontmatter string — it is also reused verbatim as
 * the SEO meta description, so it cannot carry markdown or JSX. Rather than move the sentence
 * into the MDX body (which would drop it below the Last-updated rule, out of the design's
 * position) or add a zod frontmatter schema for one page's two links, the phrases are linked
 * here at render time. The frontmatter stays a clean string; the rendered `.pd` gets anchors.
 *
 * Both phrases are proper nouns with exactly one canonical destination, so linking every
 * occurrence is correct by construction — there is no page where "Semantic Versioning" in a
 * description should point somewhere else. Today only changelog.mdx uses either.
 */
const DESCRIPTION_LINKS: ReadonlyArray<readonly [phrase: string, href: string]> = [
  ["Keep a Changelog", "https://keepachangelog.com"],
  ["Semantic Versioning", "https://semver.org"],
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Longest phrase first, so a phrase can never be swallowed by a shorter one it contains. */
const PATTERN = new RegExp(
  `(${[...DESCRIPTION_LINKS]
    .sort((a, b) => b[0].length - a[0].length)
    .map(([phrase]) => escapeRegExp(phrase))
    .join("|")})`,
  "g",
);

/**
 * Renders a page description, turning any known phrase from `DESCRIPTION_LINKS` into an
 * external anchor and leaving every other character untouched. A description containing none
 * of them renders as a single plain string, exactly as before.
 */
export function LinkedDescription({ text }: { text: string }): ReactNode {
  const out: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(PATTERN)) {
    const phrase = match[0];
    const href = DESCRIPTION_LINKS.find(([p]) => p === phrase)?.[1];
    if (href === undefined) continue;

    const start = match.index;
    if (start > cursor) out.push(text.slice(cursor, start));
    // Keyed by the phrase's character offset, which is stable and unique within the string —
    // an array index would not be, since a plain span and an anchor can swap positions.
    out.push(
      <a key={`${start}-${phrase}`} href={href} target="_blank" rel="noreferrer">
        {phrase}
      </a>,
    );
    cursor = start + phrase.length;
  }

  // No known phrase: hand back the original string untouched, as every other page does.
  if (out.length === 0) return text;
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}
