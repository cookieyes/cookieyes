import type * as PageTree from "fumadocs-core/page-tree";
import { source } from "@/lib/source";

/** One row in the search dialog, in the shape the design's modal renders. */
export interface SearchIndexEntry {
  url: string;
  title: string;
  /** Frontmatter description — the second line of a result row. */
  description: string;
  /** Sidebar section the page sits under — the right-hand label on a result row. */
  category: string;
}

/** Page tree names are ReactNode; ours are plain strings from frontmatter. */
function nodeText(name: PageTree.Node["name"]): string {
  // Separator names arrive padded ("--- Guides ---" parses to " Guides ").
  return typeof name === "string" ? name.trim() : "";
}

/**
 * Maps each page URL to the sidebar section it belongs to.
 *
 * Search results carry a url, type and matched content but no section, and the
 * design's rows are labelled with one ("Getting Started", "Frameworks"…). Walking
 * the page tree is the cheapest way to recover it, and it stays correct when
 * meta.json is reordered.
 */
function categoriesByUrl(tree: PageTree.Root): Map<string, string> {
  const categories = new Map<string, string>();

  const walk = (nodes: PageTree.Node[], section: string) => {
    // A separator relabels everything after it, which is how the root tree marks
    // its "Guides" block.
    let current = section;

    for (const node of nodes) {
      if (node.type === "separator") {
        current = nodeText(node.name);
        continue;
      }
      if (node.type === "folder") {
        const folderSection = nodeText(node.name) || current;
        if (node.index?.url) categories.set(node.index.url, folderSection);
        walk(node.children, folderSection);
        continue;
      }
      if (node.url) categories.set(node.url, current);
    }
  };

  walk(tree.children, "");
  return categories;
}

/**
 * The page index handed to the search dialog.
 *
 * Built on the server at render time and passed down as plain data, so the client
 * dialog can show a description and section per result without a second request.
 * It is small — one short record per page — and the docs tree is static.
 */
export function getSearchIndex(): SearchIndexEntry[] {
  const categories = categoriesByUrl(source.getPageTree());

  return source.getPages().map((page) => ({
    url: page.url,
    title: page.data.title,
    description: page.data.description ?? "",
    category: categories.get(page.url) ?? "",
  }));
}
