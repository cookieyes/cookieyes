import type { CY_PART } from "@cookieyes/ui";
import {
  type CSSProperties,
  type DefineComponent,
  defineComponent,
  type HTMLAttributes,
  h,
  type PropType,
  useId,
} from "vue";
import { _useRuntime } from "../composables/useRuntime.js";
import { OptOut } from "../primitives/OptOut.js";
import { cardAttrs, part } from "./part.js";

/** Every styleable part of the opt-out dialog: keys for {@link CookieOptOutProps.classNames}. */
export type OptOutPart = keyof typeof CY_PART.optOut;

/**
 * Styling passthrough. `class` and `style` target the opt-out card; `classNames` and `styles`
 * target individual parts by name, each merged on top of our defaults. A class you pass always
 * wins over ours (ours are single-class rules with no `!important`, so yours wins on source
 * order when your sheet loads later); an inline `style` wins over any class.
 */
export type CookieOptOutProps = {
  class?: HTMLAttributes["class"];
  style?: HTMLAttributes["style"];
  classNames?: Partial<Record<OptOutPart, string>>;
  styles?: Partial<Record<OptOutPart, CSSProperties>>;
};

/** The styled default opt-out dialog, built from the `OptOut` parts. */
export const CookieOptOut: DefineComponent<CookieOptOutProps> = defineComponent({
  name: "CookieOptOut",
  inheritAttrs: false,
  props: {
    classNames: { type: Object as PropType<CookieOptOutProps["classNames"]>, default: undefined },
    styles: { type: Object as PropType<CookieOptOutProps["styles"]>, default: undefined },
  },
  setup(props, { attrs }) {
    _useRuntime("<CookieOptOut>");
    // Generated, so two opt-out dialogs on one page never share an id.
    const checkboxId = useId();

    return () => {
      const { classNames, styles } = props;
      const p = (key: OptOutPart, base: string) => part(classNames, styles, key, base);
      return h(
        OptOut.Root,
        { class: "cy-dialog-overlay" },
        {
          default: () =>
            h("div", cardAttrs(["cy-dialog", "cy-optout-dialog"], attrs, classNames, styles), [
              h("div", { class: "cy-dialog-header" }, [
                h(OptOut.Title, p("title", "cy-dialog-title")),
                h(OptOut.Close, p("close", "cy-dialog-close")),
              ]),
              h("div", { class: "cy-dialog-body" }, [
                h("div", { class: "cy-dialog-content-intro" }, [
                  h(OptOut.Description, p("message", "cy-dialog-desc")),
                ]),
                h("hr", { class: "cy-separator" }),
                h("div", { class: "cy-optout-checkbox-wrapper" }, [
                  h(OptOut.Checkbox, { id: checkboxId, ...p("checkbox", "cy-optout-checkbox") }),
                  h(OptOut.CheckboxLabel, {
                    for: checkboxId,
                    ...p("checkboxLabel", "cy-optout-checkbox-label"),
                  }),
                ]),
              ]),
              h("div", { class: "cy-optout-footer" }, [
                h("div", { class: "cy-optout-action-area" }, [
                  h(
                    OptOut.Buttons,
                    { class: "cy-optout-btn-wrapper" },
                    {
                      default: () => [
                        h(OptOut.Cancel, p("cancel", "cy-btn cy-btn-cancel")),
                        h(OptOut.Save, p("confirm", "cy-btn cy-btn-confirm")),
                      ],
                    },
                  ),
                  h(OptOut.Success, p("confirmation", "cy-optout-success")),
                ]),
                h("div", { class: "cy-optout-powered-by" }, [
                  h(OptOut.Branding, p("branding", "cy-branding")),
                ]),
              ]),
            ]),
        },
      );
    };
  },
}) as unknown as DefineComponent<CookieOptOutProps>;
