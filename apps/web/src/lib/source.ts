import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";

/**
 * The docs collection. `dir` is resolved from the app root, so the MDX tree lives at
 * apps/web/content/docs and is versioned alongside the app that renders it.
 *
 * No statusBadgesPlugin: the design defines .bx-new / .bx-beta chips but never uses
 * them in its markup, so there is nothing to reproduce. Wiring it up would also mean
 * adding zod to extend the frontmatter schema, which strips unknown keys by default.
 */
const docs = defineDocs({
  dir: "content/docs",
});

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});
