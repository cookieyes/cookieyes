"use client";

import { announceBanner, CY_PART } from "@cookieyes/ui";
import { type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { useBannerVisibility } from "../hooks/useBannerVisibility.js";
import { useRegulation } from "../hooks/useRegulation.js";
import { useTranslations } from "../hooks/useTranslations.js";
import { Banner } from "../primitives/Banner.js";
import { useFocusTrap } from "../primitives/utils.js";

/** Every styleable part of the banner — keys for {@link CookieBannerProps.classNames}. */
export type BannerPart = keyof typeof CY_PART.banner;

/**
 * Styling passthrough. `className` / `style` target the visible banner card;
 * `classNames` / `styles` target individual parts by name (e.g. `acceptAll`,
 * `toggle`) — each merged on top of our defaults. A class you pass always wins
 * over ours (ours are single-class rules with no `!important`, so yours wins on source order when your sheet loads later); an inline `style`
 * wins over any class.
 */
export type CookieBannerProps = {
  className?: string;
  style?: CSSProperties;
  classNames?: Partial<Record<BannerPart, string>>;
  styles?: Partial<Record<BannerPart, CSSProperties>>;
};

export function CookieBanner({ className, style, classNames, styles }: CookieBannerProps = {}) {
  /** Merge a part's default class with the caller's `classNames`/`styles` for that part. */
  const part = (key: BannerPart, base: string) => ({
    className: [base, classNames?.[key]].filter(Boolean).join(" ") || undefined,
    style: styles?.[key],
  });

  const reg = useRegulation();
  const t = useTranslations();
  const titleId = useId();
  const isCCPA = reg === "CCPA";
  const visible = useBannerVisibility();
  // Modal: Tab stays inside the banner until the visitor answers. Focus is not
  // moved in on load; the first Tab from the page lands on the banner.
  const cardRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(visible, cardRef);

  // Rendered outside <Banner.Root>, unconditionally, so a later appearance
  // (e.g. after "reset consent") is a change to an element assistive tech has
  // tracked all along rather than a freshly inserted one. The delay is
  // `announceBanner`'s; see `@cookieyes/ui` for why it is needed.
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    if (!visible) {
      setAnnouncement("");
      return;
    }
    return announceBanner(t.bannerTitle, setAnnouncement);
  }, [visible, t.bannerTitle]);

  return (
    <>
      {/* A consent prompt is important enough to justify aria-live="assertive"
          over "polite" — it's more consistently announced by assistive tech. */}
      <span aria-live="assertive" className="cy-sr-only">
        {announcement}
      </span>
      {/* The wrapper is `display: contents` (not a style target), so suppress
          its `banner` part here — the visible card below owns it instead. */}
      <Banner.Root className="cy-banner-wrap" data-cy-part={undefined}>
        {/* Canonical banner element: the visible card carries the stable
          `data-cky-banner` hook + dialog role, and (via `display: contents` on
          the wrapper) is the only measurable banner box. */}
        <div
          ref={cardRef}
          className={["cy-banner", className, classNames?.root].filter(Boolean).join(" ")}
          style={{ ...style, ...styles?.root }}
          data-cky-banner=""
          data-cy-part={CY_PART.banner.root}
          role="dialog"
          aria-modal="true"
          // Named by the visible title. No `aria-live`: the sr-only announcer above is
          // the only live region, and two would announce the banner twice.
          aria-labelledby={titleId}
        >
          <Banner.Close {...part("close", "cy-banner-close")} />

          <div className="cy-banner-text">
            <Banner.Title id={titleId} {...part("title", "cy-banner-title")} />
            <Banner.Description {...part("description", "cy-banner-description")} />
          </div>

          <Banner.Actions {...part("actions", "cy-banner-actions")}>
            {isCCPA ? (
              <Banner.DoNotSell {...part("doNotSell", "cy-btn cy-btn-do-not-sell")} />
            ) : (
              <>
                <Banner.OpenPreferences {...part("customise", "cy-btn cy-btn-outline")} />
                <Banner.RejectAll {...part("rejectAll", "cy-btn cy-btn-primary")} />
                <Banner.AcceptAll {...part("acceptAll", "cy-btn cy-btn-primary")} />
              </>
            )}
          </Banner.Actions>

          <div className={`cy-banner-footer${isCCPA ? " cy-banner-footer--ccpa" : ""}`}>
            <Banner.Branding {...part("branding", "cy-branding")} />
          </div>
        </div>
      </Banner.Root>
    </>
  );
}
