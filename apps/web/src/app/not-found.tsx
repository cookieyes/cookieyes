import type { Metadata } from "next";
// The nav and footer are markup ported from the design; their layout lives here. Without it
// they render as unstyled text with the logo on top of the wordmark.
import "./landing.css";
import { MobileMenu } from "./MobileMenu";
import { NotFoundFocus } from "./NotFoundFocus";
import { SearchTriggers } from "./SearchTriggers";
import { SiteFooter } from "./sections/SiteFooter";
import { SiteNav } from "./sections/SiteNav";

export const metadata: Metadata = {
  title: "Page not found · CookieYes for Developers",
  description: "The link may be old, or the page may have moved.",
  // No `robots` here: Next already emits `noindex` for this file, and declaring it again
  // only puts a second, conflicting meta tag on the page.
};

const HEADING_ID = "cy-404-heading";

/**
 * The 404 page, ported from design/404/404.dc.html.
 *
 * `MobileMenu` and `SearchTriggers` are the client components that give the ported nav its
 * behaviour — the burger and the search button. They are the only JavaScript this page
 * loads: nothing here reaches a third party, sets a cookie, or reads consent.
 *
 * Next.js serves this file with a 404 status and prerenders it, so there is nothing to
 * render per request.
 */
export default function NotFound() {
  return (
    <div className="cy-page cy-light cy-nolines">
      <SearchTriggers />
      <MobileMenu />
      <SiteNav />
      <NotFoundFocus headingId={HEADING_ID} />

      <section
        className="cy-band-light"
        data-screen-label="404"
        style={{
          position: "relative",
          zIndex: "1",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "light-dark(#F8F9FA, #15171a)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "1152px",
            minHeight: "calc(100vh - 56px)",
            padding: "var(--cy-space-96) var(--cy-space-gutter)",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {/* The design paints this halo on a canvas, one dot at a time, on an animation
              frame loop. Two gradients do the same job: one tiles the 10px grid of accent
              dots, the other fades them out from the centre on the design's own curve. No
              script, no image request, and nothing to stop for reduced motion. */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              top: "40px",
              width: "900px",
              maxWidth: "100%",
              height: "320px",
              transform: "translateX(-50%)",
              zIndex: "-1",
              pointerEvents: "none",
              backgroundImage:
                "radial-gradient(circle, rgba(19, 111, 232, 0.62) 1.5px, transparent 1.5px)",
              backgroundSize: "10px 10px",
              WebkitMaskImage: DOT_FALLOFF,
              maskImage: DOT_FALLOFF,
            }}
          />

          <h1
            id={HEADING_ID}
            tabIndex={-1}
            style={{
              margin: "0px",
              maxWidth: "720px",
              fontFamily: "Poppins, Inter, sans-serif",
              fontWeight: "500",
              fontSize: "3.5rem",
              lineHeight: "60px",
              letterSpacing: "-1.6px",
              color: "var(--cy-fg)",
              textWrap: "balance",
              // Focused on arrival for screen readers, never by tabbing, so the ring the
              // browser would draw around it has nobody to inform.
              outline: "none",
            }}
          >
            <span
              style={{
                fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                fontWeight: "500",
                letterSpacing: "-1px",
                color: "var(--cy-accent)",
              }}
            >
              {"404"}
            </span>
            {/* Only the dot is hidden, never the spaces around it: taking those away too
                would leave a screen reader saying "404Page not found." */}{" "}
            <span aria-hidden="true">{"·"}</span>
            {" Page not found."}
          </h1>

          <div
            style={{
              marginTop: "var(--cy-space-40)",
              display: "flex",
              flexDirection: "row",
              gap: "var(--cy-space-12)",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <a
              href="/"
              className="scp5 scp6"
              style={{
                height: "52px",
                padding: "0 var(--cy-space-24)",
                boxSizing: "border-box",
                borderRadius: "6px",
                background: "var(--cy-accent)",
                display: "inline-flex",
                alignItems: "center",
                textDecoration: "none",
                color: "var(--cy-on-accent)",
                boxShadow:
                  "rgba(255, 255, 255, 0.28) 0px 1px 0px inset, rgba(20, 20, 42, 0.18) 0px 1px 2px",
                fontFamily: "Poppins, Inter, sans-serif",
                fontWeight: "500",
                fontSize: "1rem",
                lineHeight: "20px",
                letterSpacing: "0.1px",
                transition: "background 0.2s, transform 0.12s",
              }}
            >
              {"Take me home"}
            </a>
            <a
              href="/docs"
              className="scp7 scp6"
              style={{
                height: "52px",
                padding: "0 var(--cy-space-24)",
                boxSizing: "border-box",
                borderRadius: "6px",
                background: "var(--cy-surface)",
                border: "1px solid var(--cy-faint)",
                display: "inline-flex",
                alignItems: "center",
                textDecoration: "none",
                color: "var(--cy-fg)",
                fontFamily: "Poppins, Inter, sans-serif",
                fontWeight: "500",
                fontSize: "1rem",
                lineHeight: "20px",
                letterSpacing: "0.1px",
                transition: "background 0.2s, border-color 0.2s, transform 0.12s",
              }}
            >
              {"Read the docs"}
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

/**
 * The design's falloff, sampled every 20%, over the ellipse the canvas draws: full width,
 * and 1.7 times flatter than it is wide.
 *
 * The canvas fades each dot *and* grows it towards the centre, from 1px to 2.1px. A tiled
 * gradient can only draw one size, so the curve here folds the missing area back into the
 * alpha — `fall × (1 + 1.1 × fall)²`, normalised — which lands the same weight of ink in
 * the same places.
 */
const DOT_FALLOFF =
  "radial-gradient(ellipse 50% 83% at 50% 45%, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.42) 20%, rgba(0, 0, 0, 0.13) 40%, rgba(0, 0, 0, 0.04) 60%, rgba(0, 0, 0, 0.008) 80%, rgba(0, 0, 0, 0) 96%)";
