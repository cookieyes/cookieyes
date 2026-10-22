"use client";

import { splitPoweredBy } from "@cookieyes/ui";
import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { useTranslations } from "../hooks/useTranslations.js";
import { CookieYesLogo } from "./icons.js";

/** The "Powered by CookieYes" link shared by the banner and both dialogs. */
export const BrandingLink = forwardRef<HTMLAnchorElement, ComponentPropsWithoutRef<"a">>(
  function BrandingLink({ children, ...props }, ref) {
    const t = useTranslations();
    const [before, after] = splitPoweredBy(t.poweredBy);
    return (
      <a
        ref={ref}
        href="https://www.cookieyes.com"
        target="_blank"
        rel="noopener noreferrer"
        // Neither the visible text nor the logo says the link opens a new tab.
        aria-label={`${t.poweredBy} (${t.opensInNewTab})`}
        {...props}
      >
        {children ?? (
          <>
            {before}
            <CookieYesLogo />
            {after}
          </>
        )}
      </a>
    );
  },
);
