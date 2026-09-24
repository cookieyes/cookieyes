/**
 * The framework dimension of the docs, shared by everything that reads it: the page route,
 * the sidebar switcher, the header, search and the raw-Markdown route.
 *
 * The docs are written once in content/shared and published under `/docs/nextjs`,
 * `/docs/react` and `/docs/core` (scripts/generate-framework-docs.mjs). A page's framework
 * is therefore the first path segment, and nothing else — no stored preference decides
 * what a URL shows, which is what makes a docs link mean the same thing for everyone who
 * opens it.
 */

export const FRAMEWORKS = ["nextjs", "react", "core"] as const;

export type Framework = (typeof FRAMEWORKS)[number];

/** Where `/docs` and every old, un-prefixed docs link land. */
export const DEFAULT_FRAMEWORK: Framework = "nextjs";

/** What the switcher and the sidebar root call each framework. */
export const FRAMEWORK_LABEL: Record<Framework, string> = {
  nextjs: "Next.js",
  react: "React",
  core: "JavaScript",
};

export function isFramework(value: unknown): value is Framework {
  return typeof value === "string" && (FRAMEWORKS as readonly string[]).includes(value);
}

/** The framework a docs URL or slug list sits under, or null for the changelog and `/docs`. */
export function frameworkOf(slugsOrPath: readonly string[] | string): Framework | null {
  const first =
    typeof slugsOrPath === "string"
      ? slugsOrPath.replace(/^\/docs\/?/, "").split("/")[0]
      : slugsOrPath[0];
  return isFramework(first) ? first : null;
}

/**
 * The shared body behind a framework page, as a path under content/shared: the wrapper's
 * path under content/docs with the framework segment removed. Folder indexes keep their
 * `index.mdx`, which is why this works from the file path and not from the URL.
 */
export function sharedPath(wrapperPath: string): string {
  return wrapperPath.replace(/^(nextjs|react|core)\//, "");
}

/**
 * Resolves an absolute docs link written in a shared body for the framework the reader
 * is on.
 *
 * Bodies link the way they always did — `/docs/hooks/use-consent` — so that authors never
 * think about frameworks when cross-referencing. At render time that becomes
 * `/docs/<framework>/hooks/use-consent` if the page exists there. If it does not (a
 * JavaScript reader following a link to a React hook), the link goes to the first
 * framework that has the page, in a fixed order, rather than to a 404. Links that already
 * name a framework, the changelog, anchors and external URLs pass through untouched.
 */
export function resolveDocsHref(
  href: string,
  current: Framework | null,
  exists: (framework: Framework, rest: string) => boolean,
): string {
  if (!href.startsWith("/docs")) return href;

  const [pathPart, hash] = href.split("#", 2) as [string, string?];
  const rest = pathPart.replace(/^\/docs\/?/, "");
  const first = rest.split("/")[0] ?? "";
  if (rest === "" || first === "changelog" || isFramework(first)) return href;

  // The reader's own framework first; then React before Next.js, since a page missing
  // from JavaScript is a React-layer page and its plain-React form is the nearer one.
  const order: Framework[] = [
    ...new Set<Framework>([...(current ? [current] : []), "react", "nextjs", "core"]),
  ];
  const target = order.find((fw) => exists(fw, rest)) ?? current ?? DEFAULT_FRAMEWORK;
  return `/docs/${target}/${rest}${hash ? `#${hash}` : ""}`;
}

// ---------------------------------------------------------------------------------------
// Plain-text form of what remark-framework-docs does to the syntax tree. Used where the
// composed page is wanted as Markdown rather than HTML: the raw-Markdown route behind
// "Copy as Markdown". Kept deliberately narrow — <Framework> blocks are authored
// blank-line delimited — and kept next to the plugin's rules so the two cannot drift apart
// in what they mean.
// ---------------------------------------------------------------------------------------

const SWAPPABLE = /@cookieyes\/(react|nextjs)(\/styles\.css|\/critical\.css)?(?![\w/-])/g;
const OPT_OUT = /(^|\s)frameworkSwap=false(\s|$)/;
const USE_CLIENT = /^"use client";\n\n?/;
const APP_DIR_TITLE = /title="app\//;
/** An innermost block: one whose body opens no further <Framework>. Resolved repeatedly. */
const BLOCK = /<Framework when="([^"]*)">\s*\n((?:(?!<Framework)[\s\S])*?)\n\s*<\/Framework>\n?/g;
const FENCE = /^(```[^\n]*)\n([\s\S]*?)^```[ \t]*$/gm;
const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;

/** A shared body, as the reader on `framework` sees it, as Markdown. */
export function composeMarkdown(body: string, framework: Framework): string {
  let out = body.replace(FRONTMATTER, "");

  // Blocks nest (a React-and-Next section with a Next-only recipe inside), so resolve from
  // the inside out until none are left — the same result the tree-based plugin produces.
  for (;;) {
    const next = out.replace(BLOCK, (_m, when: string, inner: string) =>
      when.split(/\s+/).includes(framework) ? `${inner}\n` : "",
    );
    if (next === out) break;
    out = next;
  }

  out = out.replace(FENCE, (_m, opener: string, code: string) => {
    let swapped = code;
    if (framework !== "core" && !OPT_OUT.test(opener)) {
      swapped = swapped.replace(SWAPPABLE, (_s, _pkg, suffix: string | undefined) => {
        return `@cookieyes/${framework}${suffix ?? ""}`;
      });
    }
    let head = opener;
    if (framework !== "nextjs") {
      // Next.js conventions neither a plain React app nor a plain JavaScript one has.
      swapped = swapped.replace(USE_CLIENT, "");
      head = head.replace(APP_DIR_TITLE, 'title="src/');
    }
    return `${head}\n${swapped}\`\`\``;
  });

  return out.replace(/\n{3,}/g, "\n\n");
}
