import { readFile } from "node:fs/promises";
import { notFound } from "next/navigation";
import { source } from "@/lib/source";

/**
 * Serves a docs page as raw Markdown.
 *
 * Backs the "Copy as Markdown" and "View as Markdown" actions in the page meta row:
 * Fumadocs' MarkdownCopyButton fetches this URL, and ViewOptionsPopover links to it.
 * Serving the file itself — rather than re-serialising the rendered DOM the way the
 * design prototype does — keeps the frontmatter, MDX components and code fences
 * intact, which is what someone pasting this into an LLM actually wants.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page?.absolutePath) notFound();

  const content = await readFile(page.absolutePath, "utf8");

  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

export function generateStaticParams() {
  return source.generateParams();
}
