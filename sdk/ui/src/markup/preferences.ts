import type { TranslationMap } from "@cookieyes/core";
import { CY_PART, CY_STATE } from "../styles/parts.js";
import { crossIcon } from "./icons.js";
import type { UiNode } from "./node.js";
import { branding, button, el } from "./shared.js";

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
