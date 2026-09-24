import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

/**
 * Each page is tagged with its root — `nextjs`, `react`, `core` or `changelog` — so the
 * search dialog can ask for the reader's framework plus the changelog and never surface
 * a React hook to someone reading the JavaScript docs. The three framework copies of a
 * shared page would otherwise appear as three near-identical results.
 */
export const { GET } = createFromSource(source, {
  language: "english",
  // Only pages that contain every word typed. With the default (any word), a query
  // like "dark mode" also lists every page that mentions "mode".
  search: { threshold: 0 },
  buildIndex(page) {
    return {
      title: page.data.title,
      description: page.data.description,
      url: page.url,
      id: page.url,
      structuredData: page.data.structuredData,
      tag: page.slugs[0],
    };
  },
});
