import type { TranslationMap } from "@cookieyes/core";
import { CY_PART } from "../styles/parts.js";
import { revisitIcon } from "./icons.js";
import type { UiNode } from "./node.js";
import { button, el } from "./shared.js";

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
      button({ class: "cy-btn cy-btn-primary cy-reload-notice-reload", "data-cy-part": P.reload }, [
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
      "data-tooltip": t.recallButtonLabel,
    },
    [revisitIcon()],
  );
}
