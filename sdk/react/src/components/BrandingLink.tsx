"use client";

import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { useTranslations } from "../hooks/useTranslations.js";
import { CookieYesLogo } from "./icons.js";

/** The "Powered by CookieYes" link shared by the banner and both dialogs. */
export const BrandingLink = forwardRef<HTMLAnchorElement, ComponentPropsWithoutRef<"a">>(
  function BrandingLink({ children, ...props }, ref) {
    const t = useTranslations();
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
            Powered by <CookieYesLogo />
          </>
        )}
      </a>
    );
  },
);
