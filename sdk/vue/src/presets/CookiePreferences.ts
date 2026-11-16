import type { ConsentCategory } from "@cookieyes/core";
import { CY_PART, CY_STATE } from "@cookieyes/ui";
import {
  type CSSProperties,
  type DefineComponent,
  defineComponent,
  type HTMLAttributes,
  h,
  type PropType,
} from "vue";
import { _useRuntime } from "../composables/useRuntime.js";
import { useTranslations } from "../composables/useTranslations.js";
import { type CategorySlotProps, Preferences } from "../primitives/Preferences.js";
import { checkedProp } from "../primitives/utils.js";
import { cardAttrs, part } from "./part.js";

/** Every styleable part of the preferences dialog: keys for {@link CookiePreferencesProps.classNames}. */
export type DialogPart = keyof typeof CY_PART.dialog;

/**
 * Styling passthrough. `class` and `style` target the dialog card; `classNames` and `styles`
 * target individual parts by name (for example `toggle`, `save`), each merged on top of our
 * defaults. A class you pass always wins over ours (ours are single-class rules with no
 * `!important`, so yours wins on source order when your sheet loads later); an inline `style`
 * wins over any class. Style the checked toggle via the `toggle` part and
 * `[data-cy-state="on"]` (see the styling guide).
 */
export type CookiePreferencesProps = {
  class?: HTMLAttributes["class"];
  style?: HTMLAttributes["style"];
  classNames?: Partial<Record<DialogPart, string>>;
  styles?: Partial<Record<DialogPart, CSSProperties>>;
};

/** The styled default preferences dialog, built from the `Preferences` parts. */
export const CookiePreferences: DefineComponent<CookiePreferencesProps> = defineComponent({
  name: "CookiePreferences",
  inheritAttrs: false,
  props: {
    classNames: {
      type: Object as PropType<CookiePreferencesProps["classNames"]>,
      default: undefined,
    },
    styles: { type: Object as PropType<CookiePreferencesProps["styles"]>, default: undefined },
  },
  setup(props, { attrs }) {
    _useRuntime("<CookiePreferences>");
    const t = useTranslations();

    return () => {
      const { classNames, styles } = props;
      const p = (key: DialogPart, base: string) => part(classNames, styles, key, base);
      const copy = t.value;
      return h(Preferences.Root, p("overlay", "cy-dialog-overlay"), {
        default: () =>
          h(
            "div",
            {
              ...cardAttrs(["cy-dialog"], attrs, classNames, styles),
              "data-cy-part": CY_PART.dialog.root,
            },
            [
              h("div", { class: "cy-dialog-header" }, [
                h(Preferences.Title, p("title", "cy-dialog-title")),
                h(Preferences.Close, p("close", "cy-dialog-close")),
              ]),
              h("div", { class: "cy-dialog-body" }, [
                h("div", { class: "cy-dialog-content-intro" }, [
                  h(Preferences.Intro, p("intro", "cy-dialog-desc")),
                ]),
                h(
                  Preferences.Categories,
                  { class: "cy-accordion-wrapper" },
                  {
                    default: ({ category }: { category: ConsentCategory }) =>
                      h(
                        Preferences.Category,
                        { category, ...p("category", "cy-accordion") },
                        {
                          default: ({
                            label,
                            description,
                            checked,
                            disabled,
                            toggle,
                          }: CategorySlotProps) =>
                            h("div", { class: "cy-accordion-item" }, [
                              h("div", { class: "cy-accordion-header-wrapper" }, [
                                h("div", { class: "cy-accordion-header" }, [
                                  h(
                                    "span",
                                    {
                                      ...p("categoryLabel", "cy-accordion-btn"),
                                      "data-cy-part": CY_PART.dialog.categoryLabel,
                                    },
                                    label,
                                  ),
                                  disabled
                                    ? h("span", { class: "cy-always-active" }, copy.alwaysActive)
                                    : h(
                                        "label",
                                        {
                                          ...p("toggle", "cy-toggle"),
                                          "data-cy-part": CY_PART.dialog.toggle,
                                          "data-cy-state": checked ? CY_STATE.on : CY_STATE.off,
                                        },
                                        [
                                          h("input", {
                                            type: "checkbox",
                                            role: "switch",
                                            ...checkedProp(checked),
                                            "aria-checked": String(checked),
                                            "aria-label": label,
                                            onChange: (e: Event) =>
                                              toggle((e.target as HTMLInputElement).checked),
                                          }),
                                          h(
                                            "span",
                                            { class: "cy-toggle-track", "aria-hidden": "true" },
                                            [h("span", { class: "cy-toggle-thumb" })],
                                          ),
                                        ],
                                      ),
                                ]),
                                h("div", { class: "cy-accordion-header-des" }, [
                                  h(
                                    "p",
                                    {
                                      ...p("categoryDescription", ""),
                                      "data-cy-part": CY_PART.dialog.categoryDescription,
                                    },
                                    description,
                                  ),
                                ]),
                              ]),
                            ]),
                        },
                      ),
                  },
                ),
              ]),
              h("div", { class: "cy-dialog-footer" }, [
                h("span", { class: "cy-dialog-footer-shadow", "aria-hidden": "true" }),
                h("div", { class: "cy-dialog-footer-actions" }, [
                  h(Preferences.RejectAll, p("rejectAll", "cy-btn cy-btn-primary")),
                  h(Preferences.Save, p("save", "cy-btn cy-btn-primary")),
                  h(Preferences.AcceptAll, p("acceptAll", "cy-btn cy-btn-primary")),
                ]),
                h(Preferences.Branding, p("branding", "cy-branding")),
              ]),
            ],
          ),
      });
    };
  },
}) as unknown as DefineComponent<CookiePreferencesProps>;
