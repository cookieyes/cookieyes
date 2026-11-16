import { CY_PART } from "@cookieyes/ui";
import { type DefineComponent, defineComponent, h } from "vue";
import { useReloadNotice } from "../composables/useReloadNotice.js";
import { _useRuntime } from "../composables/useRuntime.js";
import { _useThemeConfig } from "../composables/useThemeConfig.js";
import { _useThemeVars } from "../composables/useThemeVars.js";
import { useTranslations } from "../composables/useTranslations.js";
import { exposeElement } from "../primitives/utils.js";

/**
 * Non-intrusive, dismissible notice shown only when a revoked tool has no clean runtime stop and
 * can be fully applied only by reloading. It never reloads on its own: the visitor stays in
 * control. Wording comes from translations (`reloadNotice.*`), so it is customisable through
 * `i18n`.
 *
 * Announced to screen readers via `role="alert"`. Reachable by keyboard; once dismissed it does
 * not reappear until a genuinely new revoke needs a reload.
 */
export const ReloadNotice: DefineComponent = defineComponent({
  name: "ReloadNotice",
  inheritAttrs: false,
  setup(_, { expose }) {
    _useRuntime("<ReloadNotice>");
    const { required, dismiss } = useReloadNotice();
    const t = useTranslations();
    const el = exposeElement(expose);
    const { theme, colorScheme } = _useThemeConfig("<ReloadNotice>");
    _useThemeVars(el, theme, colorScheme);

    return () => {
      if (!required.value) return null;
      const copy = t.value.reloadNotice;
      return h(
        "div",
        {
          ref: el,
          class: "cy-reload-notice",
          role: "alert",
          "data-cy-part": CY_PART.reloadNotice.root,
        },
        [
          h(
            "span",
            { class: "cy-reload-notice-text", "data-cy-part": CY_PART.reloadNotice.message },
            copy.message,
          ),
          h("div", { class: "cy-reload-notice-actions" }, [
            h(
              "button",
              {
                type: "button",
                class: "cy-btn cy-btn-primary cy-reload-notice-reload",
                "data-cy-part": CY_PART.reloadNotice.reload,
                onClick: () => {
                  if (typeof window !== "undefined") window.location.reload();
                },
              },
              copy.reloadButton,
            ),
            h(
              "button",
              {
                type: "button",
                class: "cy-btn cy-btn-outline cy-reload-notice-dismiss",
                "data-cy-part": CY_PART.reloadNotice.dismiss,
                onClick: dismiss,
              },
              copy.dismissButton,
            ),
          ]),
        ],
      );
    };
  },
}) as unknown as DefineComponent;
