import { stat } from "node:fs/promises";

// Notebook, not docs: the page components are paired with the layout they render
// under, and src/app/docs/layout.tsx uses the notebook layout for its top header.
import { findNeighbour } from "fumadocs-core/page-tree";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/notebook/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentProps } from "react";
import { LastUpdated } from "@/components/docs/LastUpdated";
import { LinkedDescription } from "@/components/docs/LinkedDescription";
import { PmSplit } from "@/components/docs/PmSplit";
import { TocFooter } from "@/components/docs/TocFooter";
import { getMDXComponents } from "@/components/mdx";
import { source } from "@/lib/source";

/** Where the MDX for a page is served as raw Markdown. See app/api/md. */
function markdownUrl(slugs: string[]): string {
  return `/api/md${slugs.length ? `/${slugs.join("/")}` : ""}`;
}

const REPO = "https://github.com/cookieyes/cookieyes";

/** Where a reader edits this page, and where they report a problem with it. */
function editUrl(path: string): string {
  return `${REPO}/edit/main/apps/web/content/docs/${path}`;
}

function issueUrl(title: string, url: string): string {
  const params = new URLSearchParams({
    title: `Docs: ${title}`,
    body: `Page: ${url}\n\n`,
  });
  return `${REPO}/issues/new?${params}`;
}

/**
 * Last-updated date for a page.
 *
 * Fumadocs derives this from `git log`, which is the right source — but it yields
 * nothing for a file that has never been committed, and the docs tree is not yet in
 * git. Falling back to the file's mtime keeps the stamp meaningful while the content
 * is being authored. Once a page is committed, git wins, so a CI checkout (where
 * every mtime is the checkout time) never produces a misleading date.
 */
async function lastUpdated(
  fromGit: Date | undefined,
  absolutePath: string | undefined,
): Promise<Date | undefined> {
  if (fromGit) return fromGit;
  if (!absolutePath) return undefined;
  try {
    return (await stat(absolutePath)).mtime;
  } catch {
    return undefined;
  }
}

export default async function Page(props: PageProps<"/docs/[[...slug]]">) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const md = markdownUrl(page.slugs);
  const lastModified = await lastUpdated(page.data.lastModified, page.absolutePath);

  // Design's .pnav-b (docs.html:279-283) carries only a literal "Previous"/"Next"
  // caption (`.nl`) and the neighbouring page's title (`.nt`) — never its description.
  // Fumadocs' own Footer, left to compute previous/next itself, renders the real
  // frontmatter description there instead (verified against fumadocs-ui@16.15.1's
  // layouts/notebook/page/slots/footer.js: `item.description ?? t("Previous Page")`).
  // findNeighbour is fumadocs-core's own supported way to look this up server-side —
  // the same page-tree walk Footer's internal useFooterItems()+isActive() approximates,
  // but ordered/rooted correctly — so `items` can be passed through DocsPage's real
  // prop with the description forced to the design's literal caption instead.
  const { previous, next } = findNeighbour(source.pageTree, page.url);

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      // The design shows the full trail including the current page —
      // "Getting Started › Quickstart" — rather than the parent alone.
      breadcrumb={{
        enabled: true,
        includePage: true,
        includeSeparator: true,
        className: "cy-doc-bc",
      }}
      tableOfContent={{
        // TOCItemsProps spreads unrecognized keys onto the rendered container
        // <div> (verified in fumadocs-ui's default.js), but its type is typed
        // as ComponentProps<'div'>, which has no index signature for data-*
        // attributes — the cast reflects a real, verified runtime prop, not a
        // type escape hatch for unrelated code.
        list: { "data-cy-toc-list": "" } as ComponentProps<"div">,
        footer: (
          <TocFooter editUrl={editUrl(page.path)} issueUrl={issueUrl(page.data.title, page.url)} />
        ),
      }}
      // Fumadocs' own default Footer renders unconditionally today with no class of
      // its own (verified: neither <footer> nor [data-footer] exist anywhere in its
      // render tree — the theme.css selectors that used to target those matched
      // nothing). This restyles Fumadocs' own element, the same "restyle, don't
      // rebuild" call the TOC rail and Steps rail already made — see design doc
      // §2.6. `items` (below) now supplies previous/next explicitly instead of
      // leaving Footer to compute — and render its description — itself.
      footer={{
        className: "cy-doc-pnav",
        items: {
          previous: previous ? { ...previous, description: "Previous" } : undefined,
          next: next ? { ...next, description: "Next" } : undefined,
        },
      }}
    >
      {/* Header: .bc (breadcrumb prop, above) → .ptitle[h1 + actions] → .pd → .pmeta → .phr,
          matching docs.html's own runtime assembly (initPageMeta(), docs.html:2119-2168). */}
      <div className="cy-doc-ptitle">
        <DocsTitle>{page.data.title}</DocsTitle>

        {/* .pm-split split-button (docs.html:157-179) — Copy as Markdown / caret / menu.
            See design doc content-tier-d.md. */}
        <div className="cy-doc-page-actions">
          <PmSplit markdownUrl={md} />
        </div>
      </div>

      {/* The design hyperlinks "Keep a Changelog" / "Semantic Versioning" inside .pd
          (docs.html:1780). `description` is a plain frontmatter string reused as the SEO
          meta description below, so the anchors are applied at render — see
          LinkedDescription. A description with no known phrase renders unchanged. */}
      <DocsDescription className="cy-doc-pd">
        <LinkedDescription text={page.data.description ?? ""} />
      </DocsDescription>

      {/* .pmeta now holds only the last-updated stamp (docs.html:2130) — the Markdown
          actions moved into .cy-doc-ptitle above. */}
      <div className="cy-doc-pmeta">
        {lastModified ? <LastUpdated date={lastModified} /> : null}
      </div>

      <div className="cy-doc-phr" />

      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(source, page) })} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<"/docs/[[...slug]]">): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
