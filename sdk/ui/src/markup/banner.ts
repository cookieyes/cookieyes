import type { Regulation, TranslationMap } from "@cookieyes/core";
import { CY_PART } from "../styles/parts.js";
import { crossIcon } from "./icons.js";
import type { UiNode } from "./node.js";
import { branding, button, el } from "./shared.js";

// The markup of every CookieYes component is data. React renders the same trees
// from JSX, and a test in `@cookieyes/react` renders both for every recorded
// state and fails on any difference, so a framework that draws these trees
// draws exactly what React draws.

/** What the banner needs to know to draw itself. */
export type BannerModel = {
  translations: TranslationMap;
  regulation: Regulation;
  /** Id of the title, which names the banner for screen readers. Unique on the page. */
  titleId: string;
};

/**
 * The live region that announces the banner. It sits outside the banner and
 * stays on the page while the banner comes and goes: a change to a region a
 * screen reader already tracks is announced reliably, a newly inserted one is not.
 */
export function bannerAnnouncer(text = ""): UiNode {
  return el("span", { "aria-live": "assertive", class: "cy-sr-only" }, text ? [text] : []);
}

/** The consent banner. Under CCPA it offers "Do Not Sell" instead of accept and reject. */
export function banner({ translations: t, regulation, titleId }: BannerModel): UiNode {
  const ccpa = regulation === "CCPA";
  const P = CY_PART.banner;
  const actions = ccpa
    ? [
        button(
          {
            class: "cy-btn cy-btn-do-not-sell",
            "data-cy-part": P.doNotSell,
            "aria-haspopup": "dialog",
          },
          [t.doNotSell],
        ),
      ]
    : [
        button(
          {
            class: "cy-btn cy-btn-outline",
            "data-cy-part": P.customise,
            "aria-haspopup": "dialog",
          },
          [t.managePreferences],
        ),
        button({ class: "cy-btn cy-btn-primary", "data-cy-part": P.rejectAll }, [t.rejectAll]),
        button({ class: "cy-btn cy-btn-primary", "data-cy-part": P.acceptAll }, [t.acceptAll]),
      ];
  return el("div", { class: "cy-banner-wrap" }, [
    el(
      "div",
      {
        class: "cy-banner",
        "data-cky-banner": "",
        "data-cy-part": P.root,
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": titleId,
      },
      [
        button(
          { "aria-label": t.bannerCloseLabel, "data-cy-part": P.close, class: "cy-banner-close" },
          [crossIcon(9)],
        ),
        el("div", { class: "cy-banner-text" }, [
          el("h2", { id: titleId, class: "cy-banner-title", "data-cy-part": P.title }, [
            t.bannerTitle,
          ]),
          el("p", { class: "cy-banner-description", "data-cy-part": P.description }, [
            ccpa ? t.ccpaDescription : t.bannerDescription,
          ]),
        ]),
        el("div", { class: "cy-banner-actions", "data-cy-part": P.actions }, actions),
        el("div", { class: `cy-banner-footer${ccpa ? " cy-banner-footer--ccpa" : ""}` }, [
          branding(t, P.branding),
        ]),
      ],
    ),
  ]);
}
