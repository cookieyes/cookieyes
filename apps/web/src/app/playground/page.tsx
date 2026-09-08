import type { Metadata } from "next";
import { PlaygroundSandbox } from "@/components/playground/PlaygroundSandbox";
// The nav, footer and install section are markup ported from the design; their layout lives
// here. Without it they render as unstyled text with the logo on top of the wordmark.
import "../landing.css";
import sdkManifest from "../../../../../sdk/react/package.json";
import { InstallCommandCopy } from "../InstallCommandCopy";
import { MobileMenu } from "../MobileMenu";
import { SearchTriggers } from "../SearchTriggers";
import { SiteFooter } from "../sections/SiteFooter";
import { SiteNav } from "../sections/SiteNav";
import { StartWithInstall } from "../sections/StartWithInstall";

export const metadata: Metadata = {
  title: "Playground — CookieYes for Developers",
  description:
    "Change the banner's colours, wording and categories, watch it update live, and copy the setup code. No install, no account.",
};

/**
 * The same shell as the landing page: nav, footer, and the install call to action, so the
 * playground reads as part of the site rather than a bare panel on a blank page.
 *
 * `MobileMenu`, `SearchTriggers` and `InstallCommandCopy` are the client components that
 * give that ported markup its behaviour — the burger, the search button, and the copy
 * buttons beside the install commands. Without them those controls render but do nothing.
 */
export default function PlaygroundPage() {
  return (
    <div className="cy-page cy-light cy-nolines">
      <SearchTriggers />
      <MobileMenu />
      <InstallCommandCopy />
      <SiteNav />

      <main className="cy-pg-main">
        <nav className="cy-pg-crumbs" aria-label="Breadcrumb">
          <a href="/">home</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">playground</span>
        </nav>

        <header className="cy-pg-intro">
          <h1>Playground</h1>
          <p>
            Try the banner before you install it. Change the settings, use the banner the way a
            visitor would, then copy the setup.
          </p>
        </header>

        <PlaygroundSandbox version={sdkManifest.version} />
      </main>

      <StartWithInstall />
      <SiteFooter />
    </div>
  );
}
