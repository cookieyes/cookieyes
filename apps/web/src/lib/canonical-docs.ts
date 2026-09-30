import { readFileSync } from "node:fs";
import { join } from "node:path";
import { composeMarkdown, frameworkOf, sharedPath } from "./framework-docs";
import { source } from "./source";

type DocsPage = NonNullable<ReturnType<typeof source.getPage>>;

/**
 * Which framework's copy search engines should index when the React and Next.js pages say
 * the same thing. React: it is the search term people use ("react cookie consent"), and a
 * React page applies to a Next.js app too (same components; only the import differs).
 */
const CANONICAL_FRAMEWORK = "react";
const DUPLICATE_FRAMEWORK = "nextjs";

/**
 * A composed page with what differs between the two frameworks only by convention taken
 * out: the package names, Next.js's `"use client"` lines and `app/` vs `src/` file titles
 * (the swaps composeMarkdown itself makes). What remains differs only if the page has
 * content written for one framework and not the other.
 */
function normalised(body: string, framework: "react" | "nextjs"): string {
  return (
    composeMarkdown(body, framework)
      // Both names, in both versions: a Next.js page can name @cookieyes/react on purpose
      // (the stylesheet import), which is still the same instruction.
      .replace(/@cookieyes\/(?:react|nextjs)\b/g, "@cookieyes/PKG")
      .replace(/^\s*["']use client["'];?\s*$/gm, "")
      .replace(/title="(?:app|src)\//g, 'title="DIR/')
      .replace(/\s+/g, " ")
      .trim()
  );
}

const sameCache = new Map<string, boolean>();

/** Whether the shared body reads the same for React and Next.js (see `normalised`). */
function sameForReactAndNext(sharedFile: string): boolean {
  const cached = sameCache.get(sharedFile);
  if (cached !== undefined) return cached;
  let same = false;
  try {
    const body = readFileSync(join(process.cwd(), "content", "shared", sharedFile), "utf8");
    same = normalised(body, "react") === normalised(body, "nextjs");
  } catch {
    // No shared body (a hand-written page): it is its own canonical.
  }
  sameCache.set(sharedFile, same);
  return same;
}

/**
 * The URL a docs page declares as canonical. Every page is its own canonical, except a
 * Next.js page whose content is the same as its React twin: that one points at the React
 * page, so search engines index one copy instead of choosing between two. Readers still
 * reach both, and the framework switcher still works.
 *
 * Decided from the content, not a list: once a page gains a Next.js-only section it is its
 * own canonical again. Pages whose framework-specific content matters (installation,
 * configuration, the integration guides) stay indexed under both frameworks.
 */
export function canonicalDocsPath(page: DocsPage): string {
  if (frameworkOf(page.slugs) !== DUPLICATE_FRAMEWORK) return page.url;
  const rest = page.slugs.slice(1);
  const twin = source.getPage([CANONICAL_FRAMEWORK, ...rest]);
  if (!twin) return page.url;
  return sameForReactAndNext(sharedPath(page.path)) ? twin.url : page.url;
}
