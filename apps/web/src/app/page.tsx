import type { Metadata } from "next";
import "./landing.css";
import { InstallCommandCopy } from "./InstallCommandCopy";
import { MobileMenu } from "./MobileMenu";
import { LandingMotion } from "./motion/LandingMotion";
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

export const metadata: Metadata = {
  title: "CookieYes for Developers: Consent that ships in your bundle",
  description:
    "Open-source consent for React and Next.js. Manage consent in code, control when third-party tools load, and keep everything in your frontend.",
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
      <InstallCommandCopy />
      <LandingMotion />
      <GridFrame />
      <SiteNav />
      <MobileMenu />
      <Hero />
      <Playground />
      <Performance />
      <WhatItDoes />
      <WorksWithYourStack />
      <OwnTheRecord />
      <BuiltToLast />
      <StartWithInstall />
      <SiteFooter />
    </div>
  );
}
