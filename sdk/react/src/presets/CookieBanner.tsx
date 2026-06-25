"use client";

import { useRegulation } from "../hooks/useRegulation.js";
import { useTranslations } from "../hooks/useTranslations.js";
import { Banner } from "../primitives/Banner.js";

export function CookieBanner() {
  const reg = useRegulation();
  const t = useTranslations();
  const isCCPA = reg === "CCPA";

  return (
    <Banner.Root className="cy-banner-wrap" data-cy-theme="system">
      {/* Canonical banner element: the visible card carries the stable
          `data-cky-banner` hook + dialog role, and (via `display: contents` on
          the wrapper) is the only measurable banner box. */}
      <div
        className="cy-banner"
        data-cky-banner=""
        role="dialog"
        aria-modal="false"
        aria-live="polite"
        aria-label={t.bannerTitle}
      >
        {isCCPA && <Banner.Close className="cy-banner-close" />}

        <div className="cy-banner-text">
          <Banner.Title className="cy-banner-title" />
          <Banner.Description className="cy-banner-description" />
        </div>

        <Banner.Actions className="cy-banner-actions">
          {isCCPA ? (
            <Banner.DoNotSell className="cy-btn cy-btn-do-not-sell" />
          ) : (
            <>
              <Banner.OpenPreferences className="cy-btn cy-btn-outline" />
              <Banner.RejectAll className="cy-btn cy-btn-primary" />
              <Banner.AcceptAll className="cy-btn cy-btn-primary" />
            </>
          )}
        </Banner.Actions>

        <div className={`cy-banner-footer${isCCPA ? " cy-banner-footer--ccpa" : ""}`}>
          <Banner.Branding className="cy-branding" />
        </div>
      </div>
    </Banner.Root>
  );
}
