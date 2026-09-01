import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Wordmark } from "@/components/Wordmark";

/**
 * Chrome shared by every Fumadocs layout — the docs shell today, and any future
 * layout that should carry the same header.
 *
 * The three sections and their order come straight from the design: SDKs,
 * Integrations, Changelog. DocsHeader arranges them; this only declares them.
 *
 * No version badge: the design carried a "v1.4 stable" pill in an earlier revision
 * and dropped it in the current one (its .ver-badge rule is now dead CSS). The
 * sidebar's Version select is a separate control and still to come.
 */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="cy-doc-logo">
          <Wordmark />
          <span className="cy-doc-logo-suffix">for Developers</span>
        </span>
      ),
      url: "/",
    },
    githubUrl: "https://github.com/cookieyes/cookieyes",
    // `on: "nav"` keeps these in the header only. Left at the default they are also
    // rendered into the sidebar, which duplicates them below 1024px — and the design
    // keeps the section nav visible at every width, so the sidebar copy is redundant.
    links: [
      { text: "SDKs", url: "/docs", active: "nested-url", on: "nav" },
      { text: "Integrations", url: "/docs/integrations", active: "nested-url", on: "nav" },
      { text: "Changelog", url: "/docs/changelog", active: "nested-url", on: "nav" },
    ],
  };
}
