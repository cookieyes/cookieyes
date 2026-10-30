import type { TranslationMap } from "@cookieyes/core";
import { OPT_OUT_COUNTDOWN_SECONDS } from "../state/opt-out.js";
import { CY_PART } from "../styles/parts.js";
import { crossIcon, path, svg } from "./icons.js";
import type { UiNode } from "./node.js";
import { branding, button, el } from "./shared.js";

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
  return el(
    "div",
    {
      class: "cy-optout-success",
      "data-cy-part": CY_PART.optOut.confirmation,
      role: "status",
      tabindex: "-1",
    },
    [
      el("div", { class: "cy-optout-success-inner" }, [
        el("div", { class: "cy-optout-success-row" }, [
          el("div", { class: "cy-optout-success-icon", "aria-hidden": "true" }, [successIcon()]),
          el("div", { class: "cy-optout-success-text" }, [
            t.optOut.successText,
            // Read once, together with the confirmation. The visible countdown below
            // ticks every second and is hidden from screen readers, or the status
            // region would announce every tick.
            el("span", { class: "cy-sr-only" }, [
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
    ],
  );
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
      "data-cy-part": P.checkbox,
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
            el(
              "label",
              {
                for: checkboxId,
                class: "cy-optout-checkbox-label",
                "data-cy-part": P.checkboxLabel,
              },
              [t.doNotSell],
            ),
          ]),
        ]),
        el("div", { class: "cy-optout-footer" }, [
          el("div", { class: "cy-optout-action-area" }, [
            confirmed
              ? confirmation(t, confirmed.secondsLeft)
              : el("div", { class: "cy-optout-btn-wrapper" }, [
                  button({ class: "cy-btn cy-btn-cancel", "data-cy-part": P.cancel }, [
                    t.optOut.cancel,
                  ]),
                  button({ class: "cy-btn cy-btn-confirm", "data-cy-part": P.confirm }, [
                    t.savePreferences,
                  ]),
                ]),
          ]),
          el("div", { class: "cy-optout-powered-by" }, [branding(t, P.branding)]),
        ]),
      ]),
    ],
  );
}

// Here rather than with the other icons: only the opt-out dialog draws it, and
// that dialog loads on demand.
/** The tick beside the opt-out confirmation. */
function successIcon(): UiNode {
  return svg({ height: "20", viewBox: "0 0 20 20", width: "20" }, [
    path({
      d: "M18.33 9.23V10C18.33 11.8 17.75 13.55 16.67 14.99C15.6 16.42 14.09 17.48 12.36 17.99C10.64 18.5 8.8 18.44 7.11 17.81C5.43 17.19 3.99 16.04 3.01 14.53C2.03 13.02 1.57 11.24 1.68 9.45C1.8 7.65 2.5 5.95 3.67 4.58C4.83 3.22 6.41 2.26 8.16 1.87C9.92 1.47 11.75 1.65 13.39 2.38M18.33 3.33L10 11.68L7.5 9.18",
      stroke: "currentColor",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-width": "1.5",
    }),
  ]);
}
