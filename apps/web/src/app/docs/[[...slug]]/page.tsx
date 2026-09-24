// Notebook, not docs: the page components are paired with the layout they render
// under, and src/app/docs/layout.tsx uses the notebook layout for its top header.
import { getBreadcrumbItems } from "fumadocs-core/breadcrumb";
import { findNeighbour } from "fumadocs-core/page-tree";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/notebook/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { ComponentProps } from "react";
import { LinkedDescription } from "@/components/docs/LinkedDescription";
import { PmSplit } from "@/components/docs/PmSplit";
import { TocFooter } from "@/components/docs/TocFooter";
import { getMDXComponents } from "@/components/mdx";
import {
  DEFAULT_FRAMEWORK,
  type Framework,
  frameworkOf,
  resolveDocsHref,
  sharedPath,
} from "@/lib/framework-docs";
import { source } from "@/lib/source";

/** Where the MDX for a page is served as raw Markdown. See app/api/md. */
function markdownUrl(slugs: string[]): string {
  return `/api/md${slugs.length ? `/${slugs.join("/")}` : ""}`;
}

const REPO = "https://github.com/cookieyes/cookieyes";

/**
 * Where a reader edits this page, and where they report a problem with it.
 *
 * A framework page's own file is a generated wrapper (scripts/generate-framework-docs.mjs),
 * so "Edit page" points at the shared body the text actually lives in.
 */
function editUrl(slugs: string[], path: string): string {
  const file = frameworkOf(slugs) ? `shared/${sharedPath(path)}` : `docs/${path}`;
  return `${REPO}/edit/main/apps/web/content/${file}`;
}

/**
 * MDX link components for a page under one framework. Bodies are written with
 * framework-less links (`/docs/hooks/use-consent`); these send the reader to that page
 * under their own framework, or under the first one that has it. `Card` needs the same
 * treatment as `a` because Fumadocs' Card renders its own Link, not the MDX `a`.
 */
function frameworkLinkComponents(
  framework: Framework | null,
  page: NonNullable<ReturnType<typeof source.getPage>>,
): MDXComponents {
  const exists = (fw: Framework, rest: string) =>
    source.getPage([fw, ...rest.split("/")]) !== undefined;
  const relative = createRelativeLink(source, page);
  const resolve = (href: string | undefined) =>
    typeof href === "string" ? resolveDocsHref(href, framework, exists) : href;

  const Card = getMDXComponents().Card as (props: ComponentProps<"a">) => React.ReactNode;

  return {
    a: (props: ComponentProps<"a">) => relative({ ...props, href: resolve(props.href) }),
    Card: (props: ComponentProps<"a">) => <Card {...props} href={resolve(props.href)} />,
  };
}

function issueUrl(title: string, url: string): string {
  const params = new URLSearchParams({
    title: `Docs: ${title}`,
    body: `Page: ${url}\n\n`,
  });
  return `${REPO}/issues/new?${params}`;
}

export default async function Page(props: PageProps<"/docs/[[...slug]]">) {
  const params = await props.params;
  // `/docs` itself has no page: every section lives under a framework root, and the
  // sidebar and header choose theirs from the URL. Old un-prefixed links are redirected in
  // next.config.mjs; this handles the bare path.
  if (!params.slug?.length) redirect(`/docs/${DEFAULT_FRAMEWORK}`);
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const framework = frameworkOf(page.slugs);
  const MDX = page.data.body;
  const md = markdownUrl(page.slugs);

  // Where in the changelog this page sits. Purely structural, from the slugs: the index
  // is `["changelog"]`, a release page `["changelog", "2026-09-18"]`.
  //
  // - the whole section drops Fumadocs' previous/next footer, navigating instead by the
  //   index's cards and the sidebar's release list;
  // - a release page puts badges and summary directly under its h1, with no generic
  //   chrome in between (design doc §2.6);
  // - the index has no folder above it, so its breadcrumb would only repeat its own
  //   title (the same rule hides the trail on every such page below);
  // - no changelog page offers "Edit page" or "Report issue": every one of them is
  //   generated, so there is no file on GitHub to edit, and the text they carry comes
  //   from the packages' own CHANGELOG.md rather than from anything a reader could
  //   correct here. The design draws no feedback footer on the changelog either.
  const isChangelogSection = page.slugs[0] === "changelog";
  const isReleasePage = isChangelogSection && page.slugs.length === 2;
  // The trail Fumadocs would draw, with the same options as below. A page with nothing
  // above it but the tab root (a framework root's Translations, the Integrations overview
  // and its Google Consent Mode page, the changelog index) gets a one-item trail that only
  // repeats the h1, so the trail is drawn only when it adds a parent. The Integrations
  // tab is a root folder the SDK menus do not list, which Fumadocs keeps in `fallback`.
  const breadcrumbOptions = { includePage: true, includeSeparator: true };
  const tree = source.pageTree;
  const trail =
    getBreadcrumbItems(page.url, tree, breadcrumbOptions).length ||
    (tree.fallback ? getBreadcrumbItems(page.url, tree.fallback, breadcrumbOptions).length : 0);
  const showBreadcrumb = trail > 1;

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

  // "react 0.9.0: Critical CSS, …" -> "react 0.9.0". Colon split, falling back to the whole
  // title if a release page is ever authored without one.
  const releaseVersionLabel = page.data.title.split(":")[0]?.trim() ?? page.data.title;

  return (
    <>
      {/* Next.js scrolls to the top after a navigation only if the page segment's first
          element is a real, non-sticky box that is off-screen. Fumadocs' notebook page
          starts with <main class="contents"> (zero-size, skipped) followed by the sticky
          TOC (skipped), so without this 1px anchor the new page opened at the old scroll
          position. */}
      <div className="cy-doc-scroll-anchor" aria-hidden="true" />
      <DocsPage
        toc={page.data.toc}
        full={page.data.full}
        // The design shows the full trail including the current page —
        // "Getting Started › Quickstart" — rather than the parent alone.
        breadcrumb={{
          enabled: showBreadcrumb,
          ...breadcrumbOptions,
          className: "cy-doc-bc",
        }}
        tableOfContent={{
          // TOCItemsProps spreads unrecognized keys onto the rendered container
          // <div> (verified in fumadocs-ui's default.js), but its type is typed
          // as ComponentProps<'div'>, which has no index signature for data-*
          // attributes — the cast reflects a real, verified runtime prop, not a
          // type escape hatch for unrelated code.
          list: { "data-cy-toc-list": "" } as ComponentProps<"div">,
          footer: isChangelogSection ? undefined : (
            <TocFooter
              editUrl={editUrl(page.slugs, page.path)}
              issueUrl={issueUrl(page.data.title, page.url)}
            />
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
          enabled: !isChangelogSection,
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
          {/* A release page's frontmatter title carries "react X.Y.Z: Headline" so the sidebar
            and breadcrumb read like the prototype's changelog nav, but its own <h1> shows
            the bare version (the headline is already the summary's lead-in just below). */}
          <DocsTitle>{isReleasePage ? releaseVersionLabel : page.data.title}</DocsTitle>

          {/* .pm-split split-button (docs.html:157-179) — Copy as Markdown / caret / menu.
            See design doc content-tier-d.md. */}
          <div className="cy-doc-page-actions">
            <PmSplit markdownUrl={md} />
          </div>
        </div>

        {/* Suppressed on a release detail page (§2.6): frontmatter `description` is
          retained there only for generateMetadata's SEO/social tags, never rendered,
          and <DocsBody> begins immediately after the h1 with <ReleaseBadges> etc. */}
        {!isReleasePage && (
          <>
            {/* The design hyperlinks "Keep a Changelog" / "Semantic Versioning" inside .pd
              (docs.html:1780). `description` is a plain frontmatter string reused as the SEO
              meta description below, so the anchors are applied at render — see
              LinkedDescription. A description with no known phrase renders unchanged. */}
            <DocsDescription className="cy-doc-pd">
              <LinkedDescription text={page.data.description ?? ""} />
            </DocsDescription>
          </>
        )}

        <DocsBody>
          <MDX components={getMDXComponents(frameworkLinkComponents(framework, page))} />
        </DocsBody>
      </DocsPage>
    </>
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
