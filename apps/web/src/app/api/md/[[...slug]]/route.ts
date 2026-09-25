import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import {
  composeMarkdown,
  type Framework,
  frameworkOf,
  resolveDocsHref,
  sharedPath,
} from "@/lib/framework-docs";
import { source } from "@/lib/source";

/**
 * Serves a docs page as raw Markdown.
 *
 * Backs the "Copy as Markdown" and "View as Markdown" actions in the page meta row:
 * Fumadocs' MarkdownCopyButton fetches this URL, and ViewOptionsPopover links to it.
 * Serving Markdown — rather than re-serialising the rendered DOM the way the design
 * prototype does — keeps the frontmatter, MDX components and code fences intact, which
 * is what someone pasting this into an LLM actually wants.
 *
 * A framework page's own file is a generated wrapper around a shared body
 * (scripts/generate-framework-docs.mjs), so the file itself would be one <include> line.
 * What is served instead is the body, composed for that framework the way the page was:
 * <Framework> blocks resolved and package names swapped (composeMarkdown mirrors
 * remark-framework-docs). The wrapper's frontmatter is kept, since it is the page's.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page?.absolutePath) notFound();

  const wrapper = await readFile(page.absolutePath, "utf8");
  const framework = frameworkOf(page.slugs);

  let content = wrapper;
  if (framework) {
    // `page.path` is the wrapper's path under content/docs, e.g. `core/integrations/index.mdx`;
    // the body sits at the same path under content/shared, framework segment removed.
    const body = await readFile(
      join(process.cwd(), "content", "shared", sharedPath(page.path)),
      "utf8",
    );
    const frontmatter = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(wrapper)?.[0] ?? "";
    content = `${frontmatter}\n${composeMarkdown(body, framework)}`;
  }
  content = frameworkLinks(content, framework);

  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

/**
 * The shared bodies link framework-less (`/docs/hooks/use-consent`). The HTML page sends
 * each link to the reader's own framework (see frameworkLinkComponents in the docs page);
 * this does the same for the Markdown, both in Markdown links and in the `href` of a
 * component like <Card>. Without it, a React page's Markdown led an agent into the
 * Next.js docs, and a JavaScript-only page such as the store guide into a 404.
 */
function frameworkLinks(markdown: string, framework: Framework | null): string {
  const exists = (fw: Framework, rest: string) =>
    source.getPage([fw, ...rest.split("/")]) !== undefined;
  const resolve = (href: string) => resolveDocsHref(href, framework, exists);
  return markdown
    .replace(/\]\((\/docs[^)\s]*)\)/g, (_m, href: string) => `](${resolve(href)})`)
    .replace(/href="(\/docs[^"]*)"/g, (_m, href: string) => `href="${resolve(href)}"`);
}

export function generateStaticParams() {
  return source.generateParams();
}
