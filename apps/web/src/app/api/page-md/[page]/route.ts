import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";

/**
 * Markdown for the pages that are not docs (the landing page and the playground). The
 * docs have /api/md; these two are hand-written files under content/pages, and the proxy
 * serves them when a client asks the page URL for `text/markdown`.
 */
const PAGES = new Set(["home", "playground"]);

export async function GET(_request: Request, { params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!PAGES.has(page)) notFound();

  const content = await readFile(join(process.cwd(), "content", "pages", `${page}.md`), "utf8");
  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

export function generateStaticParams() {
  return [...PAGES].map((page) => ({ page }));
}
