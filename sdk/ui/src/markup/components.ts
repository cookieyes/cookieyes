import type { Regulation, TranslationMap } from "@cookieyes/core";
import { OPT_OUT_COUNTDOWN_SECONDS } from "../state/opt-out.js";
import { CY_PART, CY_STATE } from "../styles/parts.js";
import { cookieYesLogo, crossIcon, revisitIcon, successIcon } from "./icons.js";
import type { UiChild, UiNode } from "./node.js";

// The markup of every CookieYes component, as data. React renders the same
// trees from JSX, and a test in `@cookieyes/react` renders both for every
// recorded state and fails on any difference, so a framework that draws these
// trees draws exactly what React draws.

function el(
  tag: string,
  attrs: Record<string, string | undefined>,
  children: UiChild[] = [],
): UiNode {
  const clean: Record<string, string> = {};
  for (const [name, value] of Object.entries(attrs)) if (value !== undefined) clean[name] = value;
  return { tag, attrs: clean, children };
}

/**
 * Hidden on screen and still read by screen readers. Inline, so it works
 * before the stylesheet arrives.
 */
const VISUALLY_HIDDEN =
  "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap";

/** The "Powered by CookieYes" link in the banner and both dialogs. */
function branding(t: TranslationMap, part: string | undefined): UiNode {
  return el(
    "a",
    {
      href: "https://www.cookieyes.com",
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-label": `${t.poweredBy} (${t.opensInNewTab})`,
      class: "cy-branding",
      "data-cy-part": part,
    },
    ["Powered by", cookieYesLogo()],
  );
}

function button(attrs: Record<string, string | undefined>, children: UiChild[]): UiNode {
  return el("button", { type: "button", ...attrs }, children);
}

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
  return el("span", { "aria-live": "assertive", style: VISUALLY_HIDDEN }, text ? [text] : []);
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

/** One category row in the preferences dialog. */
export type CategoryModel = {
  id: string;
  label: string;
  description: string;
  /** Whether the visitor's toggle is on. A required category is always on. */
  checked: boolean;
  required: boolean;
};

/** What the preferences dialog needs to know to draw itself. */
export type PreferencesModel = {
  translations: TranslationMap;
  titleId: string;
  categories: CategoryModel[];
};

function category(c: CategoryModel, t: TranslationMap): UiNode {
  const P = CY_PART.dialog;
  const control = c.required
    ? el("span", { class: "cy-always-active" }, [t.alwaysActive])
    : el(
        "label",
        {
          class: "cy-toggle",
          "data-cy-part": P.toggle,
          "data-cy-state": c.checked ? CY_STATE.on : CY_STATE.off,
        },
        [
          {
            tag: "input",
            attrs: {
              type: "checkbox",
              role: "switch",
              "aria-checked": `${c.checked}`,
              "aria-label": c.label,
            },
            props: { checked: c.checked },
          },
          el("span", { class: "cy-toggle-track", "aria-hidden": "true" }, [
            el("span", { class: "cy-toggle-thumb" }),
          ]),
        ],
      );
  return el("div", { role: "listitem" }, [
    el("div", { class: "cy-accordion", "data-cy-part": P.category }, [
      el("div", { class: "cy-accordion-item" }, [
        el("div", { class: "cy-accordion-header-wrapper" }, [
          el("div", { class: "cy-accordion-header" }, [
            el("span", { class: "cy-accordion-btn", "data-cy-part": P.categoryLabel }, [c.label]),
            control,
          ]),
          el("div", { class: "cy-accordion-header-des" }, [
            el("p", { "data-cy-part": P.categoryDescription }, [c.description]),
          ]),
        ]),
      ]),
    ]),
  ]);
}

/** The preferences dialog, with one switch per category that is not required. */
export function preferences({ translations: t, titleId, categories }: PreferencesModel): UiNode {
  const P = CY_PART.dialog;
  return el(
    "div",
    {
      class: "cy-dialog-overlay",
      "data-cy-part": P.overlay,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": titleId,
      tabindex: "-1",
    },
    [
      el("div", { class: "cy-dialog", "data-cy-part": P.root }, [
        el("div", { class: "cy-dialog-header" }, [
          el("h2", { id: titleId, class: "cy-dialog-title", "data-cy-part": P.title }, [
            t.preferencesTitle,
          ]),
          button(
            {
              "aria-label": t.preferencesCloseLabel,
              "data-cy-part": P.close,
              class: "cy-dialog-close",
            },
            [crossIcon(12, 1.8)],
          ),
        ]),
        el("div", { class: "cy-dialog-body" }, [
          el("div", { class: "cy-dialog-content-intro" }, [
            el("p", { class: "cy-dialog-desc", "data-cy-part": P.intro }, [t.preferencesIntro]),
          ]),
          el(
            "div",
            { class: "cy-accordion-wrapper", role: "list" },
            categories.map((c) => category(c, t)),
          ),
        ]),
        el("div", { class: "cy-dialog-footer" }, [
          el("span", { class: "cy-dialog-footer-shadow", "aria-hidden": "true" }),
          el("div", { class: "cy-dialog-footer-actions" }, [
            button({ class: "cy-btn cy-btn-primary", "data-cy-part": P.rejectAll }, [t.rejectAll]),
            button({ class: "cy-btn cy-btn-primary", "data-cy-part": P.save }, [t.savePreferences]),
            button({ class: "cy-btn cy-btn-primary", "data-cy-part": P.acceptAll }, [t.acceptAll]),
          ]),
          branding(t, P.branding),
        ]),
      ]),
    ],
  );
}

/** What the opt-out dialog needs to know to draw itself. */
export type OptOutModel = {
  translations: TranslationMap;
  titleId: string;
  /** Id of the checkbox, which its label points at. Unique on the page. */
  checkboxId: string;
  /** Whether the "Do Not Sell" box is ticked. */
  optedOut: boolean;
  /** Set once the visitor has saved an opt-out: the confirmation replaces the buttons. */
  confirmation?: { secondsLeft: number } | undefined;
};

function confirmation(t: TranslationMap, secondsLeft: number): UiNode {
  const countdown = t.optOut.successCountdown.split("{seconds}");
  return el("div", { class: "cy-optout-success", role: "status", tabindex: "-1" }, [
    el("div", { class: "cy-optout-success-inner" }, [
      el("div", { class: "cy-optout-success-row" }, [
        el("div", { class: "cy-optout-success-icon", "aria-hidden": "true" }, [successIcon()]),
        el("div", { class: "cy-optout-success-text" }, [
          t.optOut.successText,
          // Read once, together with the confirmation. The visible countdown below
          // ticks every second and is hidden from screen readers, or the status
          // region would announce every tick.
          el("span", { style: VISUALLY_HIDDEN }, [
            ` ${countdown.join(`${OPT_OUT_COUNTDOWN_SECONDS}`)}`,
          ]),
        ]),
      ]),
      el("div", { class: "cy-optout-success-subtext-wrapper", "aria-hidden": "true" }, [
        el("p", { class: "cy-optout-success-subtext" }, [
          countdown[0] ?? "",
          el("span", { class: "cy-optout-countdown" }, [`${secondsLeft}`]),
          countdown[1] ?? "",
        ]),
      ]),
    ]),
  ]);
}

/** The CCPA opt-out dialog: one "Do Not Sell" checkbox, then a confirmation. */
export function optOut({
  translations: t,
  titleId,
  checkboxId,
  optedOut,
  confirmation: confirmed,
}: OptOutModel): UiNode {
  const P = CY_PART.optOut;
  const checkbox: UiNode = {
    tag: "input",
    attrs: {
      type: "checkbox",
      id: checkboxId,
      class: "cy-optout-checkbox",
      ...(confirmed ? { disabled: "" } : {}),
    },
    props: { checked: optedOut },
  };
  return el(
    "div",
    {
      class: "cy-dialog-overlay",
      "data-cy-part": P.root,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": titleId,
      tabindex: "-1",
    },
    [
      el("div", { class: "cy-dialog cy-optout-dialog" }, [
        el("div", { class: "cy-dialog-header" }, [
          el("h2", { id: titleId, class: "cy-dialog-title", "data-cy-part": P.title }, [
            t.optOut.title,
          ]),
          button(
            { "aria-label": t.optOutCloseLabel, "data-cy-part": P.close, class: "cy-dialog-close" },
            [crossIcon(10)],
          ),
        ]),
        el("div", { class: "cy-dialog-body" }, [
          el("div", { class: "cy-dialog-content-intro" }, [
            el("p", { class: "cy-dialog-desc", "data-cy-part": P.message }, [t.optOut.description]),
          ]),
          el("hr", { class: "cy-separator" }),
          el("div", { class: "cy-optout-checkbox-wrapper" }, [
            checkbox,
            el("label", { for: checkboxId, class: "cy-optout-checkbox-label" }, [t.doNotSell]),
          ]),
        ]),
        el("div", { class: "cy-optout-footer" }, [
          el("div", { class: "cy-optout-action-area" }, [
            confirmed
              ? confirmation(t, confirmed.secondsLeft)
              : el("div", { class: "cy-optout-btn-wrapper" }, [
                  button({ class: "cy-btn cy-btn-cancel" }, [t.optOut.cancel]),
                  button({ class: "cy-btn cy-btn-confirm", "data-cy-part": P.confirm }, [
                    t.savePreferences,
                  ]),
                ]),
          ]),
          el("div", { class: "cy-optout-powered-by" }, [branding(t, undefined)]),
        ]),
      ]),
    ],
  );
}

/**
 * The notice shown when a revoked tool can only be fully stopped by reloading.
 * It never reloads on its own.
 */
export function reloadNotice(t: TranslationMap): UiNode {
  const P = CY_PART.reloadNotice;
  return el("div", { class: "cy-reload-notice", role: "alert", "data-cy-part": P.root }, [
    el("span", { class: "cy-reload-notice-text", "data-cy-part": P.message }, [
      t.reloadNotice.message,
    ]),
    el("div", { class: "cy-reload-notice-actions" }, [
      button({ class: "cy-btn cy-btn-primary cy-reload-notice-reload" }, [
        t.reloadNotice.reloadButton,
      ]),
      button(
        { class: "cy-btn cy-btn-outline cy-reload-notice-dismiss", "data-cy-part": P.dismiss },
        [t.reloadNotice.dismissButton],
      ),
    ]),
  ]);
}

/** The floating button that reopens the choice once the banner is gone. */
export function recallButton(t: TranslationMap): UiNode {
  return button(
    {
      "aria-label": t.recallButtonLabel,
      "aria-haspopup": "dialog",
      class: "cy-widget",
      "data-cy-part": CY_PART.recall.root,
      "data-pos": "bottom-left",
      "data-tooltip": t.recallButtonLabel,
    },
    [revisitIcon()],
  );
}
