import {
  CY_PART,
  initialOptOutState,
  OPT_OUT_COUNTDOWN_SECONDS,
  type OptOutEvent,
  type OptOutState,
  optOutReducer,
  startOptOutCountdown,
} from "@cookieyes/ui";
import {
  type AnchorHTMLAttributes,
  defineComponent,
  type HTMLAttributes,
  h,
  type InjectionKey,
  type InputHTMLAttributes,
  inject,
  type LabelHTMLAttributes,
  onMounted,
  provide,
  type ShallowRef,
  shallowRef,
  useId,
  watch,
} from "vue";
import { defineBranding } from "../components/BrandingLink.js";
import { crossIcon, successIcon } from "../components/icons.js";
import { useConsent } from "../composables/useConsent.js";
import { useConsentActions } from "../composables/useConsentActions.js";
import { useOptOutOpen } from "../composables/useOptOutOpen.js";
import { _useRuntime } from "../composables/useRuntime.js";
import { _useThemeConfig } from "../composables/useThemeConfig.js";
import { _useThemeVars } from "../composables/useThemeVars.js";
import { useTranslations } from "../composables/useTranslations.js";
import { type ActionComponent, defineAction, definePart } from "./action.js";
import {
  chain,
  checkedProp,
  exposeElement,
  type PartComponent,
  useAutoFocusDialog,
  useEscapeKey,
  useFocusTrap,
} from "./utils.js";

type OptOutContext = {
  state: ShallowRef<OptOutState>;
  dispatch: (event: OptOutEvent) => void;
  /** Shared so the dialog can be named by its own visible heading. */
  titleId: string;
};

const OPT_OUT_KEY: InjectionKey<OptOutContext> = Symbol("cookieyes-opt-out");

/** @internal The dialog's context, or the error a part outside `OptOut.Root` gets. */
export function useOptOutContext(): OptOutContext {
  const ctx = inject(OPT_OUT_KEY, null);
  if (!ctx) {
    throw new Error("[cookieyes] OptOut.* sub-components must be rendered inside <OptOut.Root>.");
  }
  return ctx;
}

const Root = defineComponent({
  name: "OptOutRoot",
  inheritAttrs: false,
  setup(_, { attrs, slots, expose }) {
    _useRuntime("<OptOut.Root>");
    const open = useOptOutOpen();
    const snapshot = useConsent();
    const { hideOptOut } = useConsentActions();
    const el = exposeElement(expose);
    const titleId = useId();
    const state = shallowRef(initialOptOutState(snapshot.value.categories));
    const dispatch = (event: OptOutEvent): void => {
      state.value = optOutReducer(state.value, event);
    };
    const { theme, colorScheme } = _useThemeConfig("<OptOut.Root>");

    useEscapeKey(open, hideOptOut);
    useFocusTrap(open, el);
    useAutoFocusDialog(open, el);
    _useThemeVars(el, theme, colorScheme);
    provide(OPT_OUT_KEY, { state, dispatch, titleId });

    onMounted(() => {
      // Resets only when the dialog opens: the categories at that moment are the starting point,
      // later changes are the visitor's own.
      watch(
        open,
        (isOpen) => {
          if (isOpen) dispatch({ type: "open", categories: snapshot.value.categories });
        },
        { immediate: true, flush: "post" },
      );
      watch(
        () => state.value.confirmed,
        (confirmed, _before, onCleanup) => {
          if (!confirmed) return;
          onCleanup(
            startOptOutCountdown(
              (secondsLeft) => dispatch({ type: "tick", secondsLeft }),
              hideOptOut,
            ),
          );
        },
        { immediate: true },
      );
    });

    return () =>
      open.value
        ? h(
            "div",
            {
              ref: el,
              role: "dialog",
              "aria-modal": "true",
              // Named by the heading the visitor can see, so the spoken and printed names match.
              "aria-labelledby": titleId,
              tabindex: -1,
              "data-cy-part": CY_PART.optOut.root,
              ...attrs,
            },
            slots.default?.(),
          )
        : null;
  },
}) as unknown as PartComponent<HTMLAttributes>;

const Title = definePart<HTMLAttributes>("OptOut.Title", "h2", () => {
  const { titleId } = useOptOutContext();
  const t = useTranslations();
  return () => ({
    attrs: { id: titleId, "data-cy-part": CY_PART.optOut.title },
    fallback: t.value.optOut.title,
  });
});

const Description = definePart<HTMLAttributes>("OptOut.Description", "p", () => {
  const t = useTranslations();
  return () => ({
    attrs: { "data-cy-part": CY_PART.optOut.message },
    fallback: t.value.optOut.description,
  });
});

const Close = defineAction({
  name: "OptOut.Close",
  part: CY_PART.optOut.close,
  run: (actions) => actions.hideOptOut,
  fallback: () => crossIcon(10),
  ariaLabel: (t) => t.optOutCloseLabel,
});

const Checkbox = defineComponent({
  name: "OptOutCheckbox",
  inheritAttrs: false,
  setup(_, { attrs, expose }) {
    _useRuntime("<OptOut.Checkbox>");
    const { state, dispatch } = useOptOutContext();
    const el = exposeElement(expose);
    return () => {
      const { onChange, disabled, ...rest } = attrs;
      return h("input", {
        ref: el,
        type: "checkbox",
        "data-cy-part": CY_PART.optOut.checkbox,
        ...checkedProp(state.value.optedOut),
        disabled: disabled ?? state.value.confirmed,
        onChange: chain<Event>(onChange, (e) =>
          dispatch({ type: "toggle", optedOut: (e.target as HTMLInputElement).checked }),
        ),
        ...rest,
      });
    };
  },
}) as unknown as PartComponent<Omit<InputHTMLAttributes, "type" | "checked">>;

const CheckboxLabel = definePart<LabelHTMLAttributes>("OptOut.CheckboxLabel", "label", () => {
  const t = useTranslations();
  return () => ({
    attrs: { "data-cy-part": CY_PART.optOut.checkboxLabel },
    fallback: t.value.doNotSell,
  });
});

const Cancel = defineAction({
  name: "OptOut.Cancel",
  part: CY_PART.optOut.cancel,
  run: (actions) => actions.hideOptOut,
  fallback: (t) => t.optOut.cancel,
});

const Save = defineAction({
  name: "OptOut.Save",
  part: CY_PART.optOut.confirm,
  source: "optout",
  run: (actions) => {
    const { state, dispatch } = useOptOutContext();
    // The success message confirms an opt-out only; saving without one just closes.
    return () => {
      if (state.value.optedOut) {
        actions.rejectAll();
        dispatch({ type: "confirm" });
      } else {
        actions.acceptAll();
        actions.hideOptOut();
      }
    };
  },
  fallback: (t) => t.savePreferences,
});

const Buttons = defineComponent({
  name: "OptOutButtons",
  inheritAttrs: false,
  setup(_, { attrs, slots, expose }) {
    _useRuntime("<OptOut.Buttons>");
    const { state } = useOptOutContext();
    const el = exposeElement(expose);
    return () =>
      state.value.confirmed ? null : h("div", { ref: el, ...attrs }, slots.default?.());
  },
}) as unknown as PartComponent<HTMLAttributes>;

const Success = defineComponent({
  name: "OptOutSuccess",
  inheritAttrs: false,
  setup(_, { attrs, expose }) {
    _useRuntime("<OptOut.Success>");
    const { state } = useOptOutContext();
    const t = useTranslations();
    const el = exposeElement(expose);
    // The focused Save button is gone once saved. Move focus here, so the confirmation is read
    // and keyboard users keep their place inside the dialog.
    onMounted(() => {
      watch(
        () => state.value.confirmed,
        (saved) => {
          if (saved) el.value?.focus();
        },
        { immediate: true, flush: "post" },
      );
    });
    return () => {
      if (!state.value.confirmed) return null;
      const copy = t.value.optOut;
      const countdown = copy.successCountdown.split("{seconds}");
      return h(
        "div",
        {
          ref: el,
          "data-cy-part": CY_PART.optOut.confirmation,
          role: "status",
          tabindex: -1,
          ...attrs,
        },
        [
          h("div", { class: "cy-optout-success-inner" }, [
            h("div", { class: "cy-optout-success-row" }, [
              h("div", { class: "cy-optout-success-icon", "aria-hidden": "true" }, [successIcon()]),
              h("div", { class: "cy-optout-success-text" }, [
                copy.successText,
                // Screen readers get the countdown as one fixed sentence, in the same text as the
                // confirmation so both are read together. The visible one below ticks every
                // second, and `role="status"` would re-announce each tick, so it is hidden from
                // them instead.
                h(
                  "span",
                  { class: "cy-sr-only" },
                  ` ${countdown.join(`${OPT_OUT_COUNTDOWN_SECONDS}`)}`,
                ),
              ]),
            ]),
            h("div", { class: "cy-optout-success-subtext-wrapper", "aria-hidden": "true" }, [
              h("p", { class: "cy-optout-success-subtext" }, [
                countdown[0],
                h("span", { class: "cy-optout-countdown" }, String(state.value.secondsLeft)),
                ...(countdown[1] ? [countdown[1]] : []),
              ]),
            ]),
          ]),
        ],
      );
    };
  },
}) as unknown as PartComponent<HTMLAttributes>;

const Branding = defineBranding("OptOut.Branding", CY_PART.optOut.branding);

/** The opt-out dialog's parts. Compose them, or use `<CookieOptOut />`. */
export const OptOut: {
  Root: PartComponent<HTMLAttributes>;
  Title: PartComponent<HTMLAttributes>;
  Description: PartComponent<HTMLAttributes>;
  Close: ActionComponent;
  Checkbox: PartComponent<Omit<InputHTMLAttributes, "type" | "checked">>;
  CheckboxLabel: PartComponent<LabelHTMLAttributes>;
  Cancel: ActionComponent;
  Save: ActionComponent;
  Buttons: PartComponent<HTMLAttributes>;
  Success: PartComponent<HTMLAttributes>;
  Branding: PartComponent<AnchorHTMLAttributes>;
} = {
  Root,
  Title,
  Description,
  Close,
  Checkbox,
  CheckboxLabel,
  Cancel,
  Save,
  Buttons,
  Success,
  Branding,
};
