import type { Metadata } from "next";
import "./landing.css";
import { JsonLd } from "@/components/JsonLd";
import { pageMetadata, SITE_NAME, SITE_URL } from "@/lib/site";
import { InstallCommandCopy } from "./InstallCommandCopy";
import { MobileMenu } from "./MobileMenu";
import { LandingMotion } from "./motion/LandingMotion";
import { SearchTriggers } from "./SearchTriggers";
import { MAIN_CONTENT_ID } from "./SkipLink";
import { BuiltToLast } from "./sections/BuiltToLast";
import { GridFrame } from "./sections/GridFrame";
import { Hero } from "./sections/Hero";
import { OwnTheRecord } from "./sections/OwnTheRecord";
import { Performance } from "./sections/Performance";
import { Playground } from "./sections/Playground";
import { SiteFooter } from "./sections/SiteFooter";
import { SiteNav } from "./sections/SiteNav";
import { StartWithInstall } from "./sections/StartWithInstall";
import { WhatItDoes } from "./sections/WhatItDoes";
import { WorksWithYourStack } from "./sections/WorksWithYourStack";

export const metadata: Metadata = pageMetadata({
  title: "CookieYes for Developers: Consent that ships in your bundle",
  absoluteTitle: true,
  description:
    "Open-source cookie consent SDK for React and Next.js. Manage consent in code, control when third-party tools load, and keep everything in your frontend.",
  path: "/",
});

const REPO_URL = "https://github.com/cookieyes/cookieyes";

/**
 * What the homepage is, for search engines: this site, the company behind it, and the
 * open-source SDK it documents. Only facts the page itself states.
 */
const STRUCTURED_DATA = {
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.cookieyes.com/#organization",
      name: "CookieYes",
      url: "https://www.cookieyes.com",
      logo: `${SITE_URL}/apple-icon`,
      sameAs: [REPO_URL],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: "en",
      publisher: { "@id": "https://www.cookieyes.com/#organization" },
    },
    {
      "@type": "SoftwareSourceCode",
      name: "CookieYes consent SDK",
      description:
        "Open-source cookie consent SDK for React and Next.js, with a framework-free JavaScript core.",
      codeRepository: REPO_URL,
      programmingLanguage: "TypeScript",
      license: "https://opensource.org/licenses/MIT",
      author: { "@id": "https://www.cookieyes.com/#organization" },
    },
  ],
};

/**
 * The landing page: the design's sections in the design's order, plus the two headless
 * components that give the ported markup its behaviour and motion.
 *
 * The wrapper's classes are the design's own appearance switches — `cy-page` scopes the
 * design's body-level rules to this subtree, `cy-light` selects the light theme, and
 * `cy-nolines` hides the decorative section rules.
 */
export default function LandingPage() {
  return (
    <div className="cy-page cy-light cy-nolines">
      <JsonLd data={STRUCTURED_DATA} />
      <InstallCommandCopy />
      <SearchTriggers />
      <LandingMotion />
      <GridFrame />
      <SiteNav />
      <MobileMenu />
      <main id={MAIN_CONTENT_ID}>
        <Hero />
        <Playground />
        <Performance />
        <WhatItDoes />
        <WorksWithYourStack />
        <OwnTheRecord />
        <BuiltToLast />
        <StartWithInstall />
      </main>
      <SiteFooter />
    </div>
  );
}
