"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { useBannerVisibility } from "../hooks/useBannerVisibility.js";
import { useRegulation } from "../hooks/useRegulation.js";
import { useTranslations } from "../hooks/useTranslations.js";
import { Banner } from "../primitives/Banner.js";
import { CY_PART } from "../styles/parts.js";

const ANNOUNCE_DELAY_MS = 700;

/** Every styleable part of the banner — keys for {@link CookieBannerProps.classNames}. */
export type BannerPart = keyof typeof CY_PART.banner;

/**
 * Styling passthrough. `className` / `style` target the visible banner card;
 * `classNames` / `styles` target individual parts by name (e.g. `acceptAll`,
 * `toggle`) — each merged on top of our defaults. A class you pass always wins
 * over ours (our styles sit in the `cookieyes` cascade layer); an inline `style`
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
  const isCCPA = reg === "CCPA";
  const visible = useBannerVisibility();

  // Rendered outside <Banner.Root> (unconditionally, not tied to the
  // banner's own mount/hide cycle) and populated after a real delay, not
  // just React's next tick — both matter:
  //
  // - On first page load, this component itself is mounting for the first
  //   time regardless of where the span lives, so "already in the DOM"
  //   alone doesn't fix the very first appearance. What actually helps
  //   there is the delay: screen readers are typically still announcing
  //   the page navigation itself right after load, and a live-region
  //   update fired within that window commonly gets dropped rather than
  //   queued. A few hundred ms of headroom avoids competing with it.
  // - On later appearances (e.g. after "reset consent" while the banner
  //   was already hidden), keeping the region outside the conditional
  //   mount means it's a change to an element the AT has tracked all
  //   along, not a freshly-inserted one — the reliable case either way.
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    if (!visible) {
      setAnnouncement("");
      return;
    }
    const id = setTimeout(() => setAnnouncement(t.bannerTitle), ANNOUNCE_DELAY_MS);
    return () => clearTimeout(id);
  }, [visible, t.bannerTitle]);

  return (
    <>
      {/* A consent prompt is important enough to justify aria-live="assertive"
          over "polite" — it's more consistently announced by assistive tech. */}
      <span
        aria-live="assertive"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
        }}
      >
        {announcement}
      </span>
      {/* The wrapper is `display: contents` (not a style target), so suppress
          its `banner` part here — the visible card below owns it instead. */}
      <Banner.Root className="cy-banner-wrap" data-cy-part={undefined}>
        {/* Canonical banner element: the visible card carries the stable
          `data-cky-banner` hook + dialog role, and (via `display: contents` on
          the wrapper) is the only measurable banner box. */}
        <div
          className={["cy-banner", className, classNames?.root].filter(Boolean).join(" ")}
          style={{ ...style, ...styles?.root }}
          data-cky-banner=""
          data-cy-part={CY_PART.banner.root}
          role="dialog"
          aria-modal="false"
          aria-live="polite"
          aria-label={t.bannerTitle}
        >
          {isCCPA && <Banner.Close {...part("close", "cy-banner-close")} />}

          <div className="cy-banner-text">
            <Banner.Title {...part("title", "cy-banner-title")} />
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
