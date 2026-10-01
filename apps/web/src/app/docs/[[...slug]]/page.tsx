// Notebook, not docs: the page components are paired with the layout they render
// under, and src/app/docs/layout.tsx uses the notebook layout for its top header.
import { getBreadcrumbItems, searchPath } from "fumadocs-core/breadcrumb";
import { findNeighbour } from "fumadocs-core/page-tree";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/notebook/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentProps } from "react";
import { MAIN_CONTENT_ID } from "@/app/SkipLink";
import { type Crumb, DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb";
import { LinkedDescription } from "@/components/docs/LinkedDescription";
import { PmSplit } from "@/components/docs/PmSplit";
import { TocFooter } from "@/components/docs/TocFooter";
import { JsonLd } from "@/components/JsonLd";
import { getMDXComponents } from "@/components/mdx";
import {
  FRAMEWORK_LABEL,
  type Framework,
  frameworkOf,
  resolveDocsHref,
  sharedPath,
} from "@/lib/framework-docs";
import { pageMetadata, SITE_URL } from "@/lib/site";
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

/**
 * The page's place in the docs, as schema.org breadcrumbs: Home, the framework, each
 * section above the page that is a page itself, then the page. Built from the same trail
 * the visible breadcrumb uses; a section without its own URL is left out, since every
 * item but the last must link somewhere.
 */
function breadcrumbData(
  page: NonNullable<ReturnType<typeof source.getPage>>,
  framework: Framework | null,
): Record<string, unknown> {
  const crumbs: { name: string; url: string }[] = [{ name: "Home", url: "/" }];
  if (framework) {
    crumbs.push({
      name: FRAMEWORK_LABEL[framework],
      url: `/docs/${framework}/getting-started/installation`,
    });
  } else if (page.slugs[0] === "changelog" && page.slugs.length > 1) {
    crumbs.push({ name: "Changelog", url: "/docs/changelog" });
  }
  const trail = getBreadcrumbItems(page.url, source.pageTree, { includePage: false });
  for (const item of trail) {
    if (typeof item.name === "string" && item.url && !crumbs.some((c) => c.url === item.url)) {
      crumbs.push({ name: item.name, url: item.url });
    }
  }
  if (!crumbs.some((c) => c.url === page.url))
    crumbs.push({ name: page.data.title, url: page.url });

  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.url === "/" ? "" : crumb.url}`,
    })),
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
  // `/docs` is the neutral landing page (content/docs/index.mdx) that sends each reader
  // to their framework; every other section lives under a framework root. Old
  // un-prefixed links are redirected in next.config.mjs.
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
  //
  // A framework page's trail starts with its framework ("React › Styling › CSP"), linked
  // to that framework's installation page like the JSON-LD trail below. An Integrations
  // page also names its tab, linked to the tab's overview:
  // "React › Integrations › Ready-made integrations › GA4".
  const breadcrumbOptions = { includePage: true, includeSeparator: true };
  const tree = source.pageTree;
  const inMainTree = getBreadcrumbItems(page.url, tree, breadcrumbOptions);
  const trail: Crumb[] =
    inMainTree.length || !tree.fallback
      ? inMainTree
      : getBreadcrumbItems(page.url, tree.fallback, breadcrumbOptions);
  if (framework && !inMainTree.length && tree.fallback) {
    // Fumadocs' own includeRoot names the whole tree ("Docs"), not the tab's folder.
    const tab = (searchPath(tree.fallback.children, page.url) ?? [])
      .filter((node) => node.type === "folder" && node.root)
      .at(-1);
    // The Integrations overview is the tab's first page, not a folder index.
    if (tab?.type === "folder") {
      const url = tab.index?.url ?? tab.children.find((node) => node.type === "page")?.url;
      trail.unshift({ name: tab.name, url });
    }
  }
  if (framework) {
    trail.unshift({
      name: FRAMEWORK_LABEL[framework],
      url: `/docs/${framework}/getting-started/installation`,
    });
  }

  // The React and Next.js copies of a page would otherwise open with the same trail and
  // h1, so the two frameworks get different headers:
  // - React: the breadcrumb above, and an h1 that names the framework ("CSP for React");
  // - Next.js: no breadcrumb, only the section the page sits in as a small label above a
  //   plain h1 ("STYLING" / "CSP"), the way c15t's docs head a page.
  // Pages outside a framework (the changelog) keep the breadcrumb.
  const isNext = framework === "nextjs";
  const showBreadcrumb = !isNext && trail.length > 1;
  // The crumb above the page, skipping the framework itself: a top-level page such as
  // Translations has no section to name.
  const section = isNext && trail.length > 2 ? trail.at(-2)?.name : undefined;

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
      <JsonLd data={breadcrumbData(page, framework)} />
      <DocsPage
        toc={page.data.toc}
        full={page.data.full}
        // The design shows the full trail including the current page —
        // "Getting Started › Quickstart" — rather than the parent alone. Drawn by
        // DocsBreadcrumb as the first child, where Fumadocs' own slot would sit.
        breadcrumb={{ enabled: false }}
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
        {/* Header: .bc → .ptitle[h1 + actions] → .pd → .pmeta → .phr,
          matching docs.html's own runtime assembly (initPageMeta(), docs.html:2119-2168). */}
        {showBreadcrumb && <DocsBreadcrumb items={trail} />}
        {section && <div className="cy-doc-eyebrow">{section}</div>}
        {/* The skip link's target. Fumadocs' own <main> is display: contents, which cannot
            be scrolled to, so the page title stands in for it. */}
        <div className="cy-doc-ptitle" id={MAIN_CONTENT_ID}>
          {/* A release page's frontmatter title carries "react X.Y.Z: Headline" so the sidebar
            and breadcrumb read like the prototype's changelog nav, but its own <h1> shows
            the bare version (the headline is already the summary's lead-in just below). */}
          {/* A React page's h1 names its framework ("CSP for React"); see the header note
            above. The sidebar and breadcrumb keep the short title, and the suffix is muted
            so the topic still leads. */}
          <DocsTitle>
            {isReleasePage ? releaseVersionLabel : page.data.title}
            {framework && !isNext && (
              <span className="cy-doc-h1-fw"> for {FRAMEWORK_LABEL[framework]}</span>
            )}
          </DocsTitle>

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

  // The same page exists under each framework, so its title and description name the one
  // it is for: "Installation · Next.js", "Next.js: Install the packages…". Otherwise the
  // React and Next.js copies of every page share both, and search engines treat them as
  // duplicates. The changelog belongs to no framework and keeps its own.
  const framework = frameworkOf(page.slugs);
  const label = framework ? FRAMEWORK_LABEL[framework] : null;
  const description = page.data.description;
  // A release page's frontmatter title carries "react 0.3.0: <headline>", often past 60
  // characters on its own, so it goes out without the site-name suffix.
  const isRelease = page.slugs[0] === "changelog" && page.slugs.length === 2;
  return pageMetadata({
    title: label ? `${page.data.title} · ${label}` : page.data.title,
    absoluteTitle: isRelease,
    description: label && description ? `${label}: ${description}` : description,
    path: page.url,
  });
}
