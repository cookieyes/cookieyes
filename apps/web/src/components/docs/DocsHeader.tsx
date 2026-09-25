"use client";

import { usePathname } from "fumadocs-core/framework";
import Link from "fumadocs-core/link";
import { useNotebookLayout } from "fumadocs-ui/layouts/notebook";
import { LinkItem, type LinkItemType, type MainItemType } from "fumadocs-ui/layouts/shared";
import { useEffect } from "react";
import { DEFAULT_FRAMEWORK, frameworkOf } from "@/lib/framework-docs";
import { ThemeToggle } from "../ThemeToggle";

/**
 * The section links are declared framework-less in layout.shared.tsx (`/docs`,
 * `/docs/integrations`). Here they point into the framework the reader is on, so the
 * header never takes them out of it: on `/docs/react/hooks/…`, "SDKs" is `/docs/react` and
 * "Integrations" is `/docs/react/integrations`. The changelog has no framework and keeps
 * its URL. Off any framework (the changelog itself), the default one is used.
 */
function inFramework(url: string, pathname: string): string {
  if (!url.startsWith("/docs") || url.startsWith("/docs/changelog")) return url;
  const framework = frameworkOf(pathname) ?? DEFAULT_FRAMEWORK;
  return url.replace(/^\/docs/, `/docs/${framework}`);
}

/**
 * Where a section link actually goes. A framework root ("SDKs" → `/docs/react`) has no
 * page of its own and redirects to its installation page, so the link points there
 * directly instead of through the redirect. The root stays the section's identity for
 * working out which tab is active.
 */
function linkTarget(url: string): string {
  return /^\/docs\/[^/]+$/.test(url) && frameworkOf(url)
    ? `${url}/getting-started/installation`
    : url;
}

/** Fumadocs' own classes on the header element. Kept verbatim: they carry the grid
 *  placement, sticky offset and stacking the layout depends on. Only what sits
 *  *inside* is reordered. */
const HEADER_CLASS =
  "sticky [grid-area:header] flex flex-col top-(--fd-docs-row-1) z-10 backdrop-blur-sm " +
  "transition-colors data-[transparent=false]:bg-fd-background/80";

/** Narrows to the plain text+url links the section nav renders. Button and menu
 *  items are not used here; an icon item is the GitHub button, handled separately. */
function isSectionLink(item: LinkItemType): item is MainItemType {
  return (item.type === undefined || item.type === "main") && "url" in item;
}

/** Narrows to the link items that carry a url. Generic so it still narrows when
 *  chained after a filter that has already reduced the union. */
function hasUrl<T extends LinkItemType>(item: T): item is T & { url: string } {
  return "url" in item && typeof item.url === "string";
}

/**
 * Picks the one active section by longest matching url prefix.
 *
 * Plain `nested-url` matching cannot do this here: every section lives under
 * /docs, so /docs would match /docs/changelog as well and two tabs would light up.
 * The design shows exactly one active section, so the most specific match wins.
 */
function activeSectionUrl(pathname: string, urls: string[]): string | undefined {
  let best: string | undefined;
  for (const url of urls) {
    const matches = pathname === url || pathname.startsWith(`${url}/`);
    if (matches && (best === undefined || url.length > best.length)) best = url;
  }
  return best;
}

/**
 * The docs header, laid out in the design's order rather than Fumadocs'.
 *
 * Design order, left to right:
 *   [wordmark + "for Developers"] [divider] [SDKs · Integrations · Changelog]
 *   … flexible gap … [search 360px ⌘K] [GitHub]
 *
 * Fumadocs' notebook header instead centres search and pushes the section nav to
 * the right, and the nav group is nested inside the right-hand cluster, so CSS
 * `order` cannot reach it. Replacing the slot is the supported way to change this —
 * `slots.header` is a first-class override and everything below is composed from
 * exported building blocks (navTitle, searchTrigger, sidebar.trigger), so search,
 * the mobile drawer and the command menu keep their behaviour.
 *
 * The theme toggle below is the design's real control: `docs.html:335` ships a
 * wired `#themeBtn` (`onclick="toggleTheme()"`), it is not dead code. It lives here
 * rather than the sidebar footer, matching the design's header placement.
 */
export function DocsHeader() {
  const {
    slots,
    navItems,
    isNavTransparent,
    props: { nav },
  } = useNotebookLayout();
  const { open, setOpen } = slots.sidebar?.useSidebar?.() ?? {};
  const pathname = usePathname();

  // Escape closes the mobile drawer, and focus goes back to the button that opened it.
  // Fumadocs' drawer closes on a backdrop tap or a link only.
  useEffect(() => {
    if (!open || !setOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      document.querySelector<HTMLElement>('[aria-controls="nd-sidebar-mobile"]')?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  const sectionLinks = navItems
    .filter(isSectionLink)
    .map((item) => ({ ...item, url: inFramework(item.url, pathname) }));
  const iconLinks = navItems.filter((item) => item.type === "icon").filter(hasUrl);
  const activeUrl = activeSectionUrl(
    pathname,
    sectionLinks.map((item) => item.url),
  );

  if (nav?.component) return nav.component;

  return (
    <header id="nd-subnav" data-transparent={isNavTransparent && !open} className={HEADER_CLASS}>
      <div data-header-body="" className="cy-doc-hd">
        {slots.navTitle ? <slots.navTitle className="cy-doc-hd-logo" /> : null}

        <span className="cy-doc-hd-div" aria-hidden="true" />

        <nav className="cy-doc-hd-nav" aria-label="Documentation sections">
          {sectionLinks.map((item) => {
            const active = item.url === activeUrl;
            return (
              <Link
                key={item.url}
                href={linkTarget(item.url)}
                className="cy-doc-hd-nav-a"
                data-active={active}
                aria-current={active ? "page" : undefined}
              >
                {item.text}
              </Link>
            );
          })}
        </nav>

        <div className="cy-doc-hd-right">
          {slots.searchTrigger ? (
            <slots.searchTrigger.full hideIfDisabled className="cy-doc-hd-search" />
          ) : null}

          {iconLinks.map((item) => (
            <LinkItem
              key={item.url}
              item={item}
              className="cy-doc-hd-icon"
              aria-label={item.type === "icon" ? item.label : undefined}
            >
              {item.type === "icon" ? item.icon : null}
            </LinkItem>
          ))}

          {/* The design's real theme control (docs.html:335, `#themeBtn`) — permanent,
              not temporary. Sized to match the adjacent GitHub icon's house style
              rather than the design's literal 40px `.gh-a`, for the same reason the
              search pill does (see the note above .cy-doc-hd-search in theme.css).
              A hand-rolled button rather than Fumadocs' own `ThemeSwitch`: that
              component renders both a sun and a moon glyph in one pill and marks
              the active one via a `bg-fd-accent` class, which does not match the
              design's single-glyph square and required brittle CSS to fake (see the
              removed `.cy-doc-hd-theme svg` rules in theme.css). `applyTheme()`
              (docs.html:2195) shows the mode you would switch TO, not the current
              one — a moon in light mode, a sun in dark mode — so this mirrors that
              polarity exactly rather than Fumadocs' current-state icon. */}
          <ThemeToggle className="cy-doc-hd-theme" />

          {/* Below md the search pill and sidebar collapse; these take over. */}
          <div className="cy-doc-hd-compact">
            {slots.searchTrigger ? <slots.searchTrigger.sm hideIfDisabled className="p-2" /> : null}
            {slots.sidebar ? (
              <slots.sidebar.trigger className="cy-doc-hd-icon" aria-label="Open sidebar">
                <SidebarIcon />
              </slots.sidebar.trigger>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

/** Inlined rather than pulled from lucide-react, which is Fumadocs' dependency and
 *  not one this app declares. */
function SidebarIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </svg>
  );
}
