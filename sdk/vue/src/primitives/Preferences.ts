import type { ConsentCategory } from "@cookieyes/core";
import { CY_PART, categoryText } from "@cookieyes/ui";
import {
  type AnchorHTMLAttributes,
  defineComponent,
  type HTMLAttributes,
  h,
  type InjectionKey,
  inject,
  provide,
  useId,
} from "vue";
import { defineBranding } from "../components/BrandingLink.js";
import { crossIcon } from "../components/icons.js";
import { useCategories } from "../composables/useCategories.js";
import { useConsent } from "../composables/useConsent.js";
import { useConsentActions } from "../composables/useConsentActions.js";
import { usePreferencesOpen } from "../composables/usePreferencesOpen.js";
import { _useRuntime } from "../composables/useRuntime.js";
import { _useThemeConfig } from "../composables/useThemeConfig.js";
import { _useThemeVars } from "../composables/useThemeVars.js";
import { useTranslations } from "../composables/useTranslations.js";
import { type ActionComponent, defineAction, definePart } from "./action.js";
import {
  exposeElement,
  type PartComponent,
  useAutoFocusDialog,
  useEscapeKey,
  useFocusTrap,
} from "./utils.js";

type PreferencesContext = {
  /** Shared so the dialog can be named by its own visible heading. */
  titleId: string;
};

const PREFERENCES_KEY: InjectionKey<PreferencesContext> = Symbol("cookieyes-preferences");

/** @internal The dialog's context, or the error a part outside `Preferences.Root` gets. */
export function usePreferencesContext(): PreferencesContext {
  const ctx = inject(PREFERENCES_KEY, null);
  if (!ctx) {
    throw new Error(
      "[cookieyes] Preferences.* sub-components must be rendered inside <Preferences.Root>.",
    );
  }
  return ctx;
}

/** What a `Preferences.Category` slot receives for one category. */
export type CategorySlotProps = {
  category: ConsentCategory;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  toggle: (next: boolean) => void;
};

const Root = defineComponent({
  name: "PreferencesRoot",
  inheritAttrs: false,
  setup(_, { attrs, slots, expose }) {
    _useRuntime("<Preferences.Root>");
    const open = usePreferencesOpen();
    const { hidePreferences } = useConsentActions();
    const el = exposeElement(expose);
    const titleId = useId();
    const { theme, colorScheme } = _useThemeConfig("<Preferences.Root>");

    useEscapeKey(open, hidePreferences);
    useFocusTrap(open, el);
    useAutoFocusDialog(open, el);
    _useThemeVars(el, theme, colorScheme);
    provide(PREFERENCES_KEY, { titleId });

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
              "data-cy-part": CY_PART.dialog.overlay,
              ...attrs,
            },
            slots.default?.(),
          )
        : null;
  },
}) as unknown as PartComponent<HTMLAttributes>;

const Title = definePart<HTMLAttributes>("Preferences.Title", "h2", () => {
  const { titleId } = usePreferencesContext();
  const t = useTranslations();
  return () => ({
    attrs: { id: titleId, "data-cy-part": CY_PART.dialog.title },
    fallback: t.value.preferencesTitle,
  });
});

const Intro = definePart<HTMLAttributes>("Preferences.Intro", "p", () => {
  const t = useTranslations();
  return () => ({
    attrs: { "data-cy-part": CY_PART.dialog.intro },
    fallback: t.value.preferencesIntro,
  });
});

const Description = definePart<HTMLAttributes>("Preferences.Description", "p", () => () => ({}));

const Close = defineAction({
  name: "Preferences.Close",
  part: CY_PART.dialog.close,
  run: (actions) => actions.hidePreferences,
  fallback: () => crossIcon(12, 1.8),
  ariaLabel: (t) => t.preferencesCloseLabel,
});

const Categories = defineComponent({
  name: "PreferencesCategories",
  inheritAttrs: false,
  setup(_, { attrs, slots, expose }) {
    _useRuntime("<Preferences.Categories>");
    const categories = useCategories();
    const el = exposeElement(expose);
    // Iterates the configured taxonomy (custom list or the built-in five), in declaration order.
    return () =>
      h(
        "div",
        { ref: el, role: "list", ...attrs },
        categories.value.ids.map((category) =>
          h("div", { key: category, role: "listitem" }, slots.default?.({ category })),
        ),
      );
  },
}) as unknown as PartComponent<
  HTMLAttributes,
  { default?: (props: { category: ConsentCategory }) => unknown }
>;

const Category = defineComponent({
  name: "PreferencesCategory",
  inheritAttrs: false,
  props: { category: { type: String, required: true } },
  setup(props, { attrs, slots, expose }) {
    const runtime = _useRuntime("<Preferences.Category>");
    const snapshot = useConsent();
    const { updateCategory } = useConsentActions();
    const categories = useCategories();
    const t = useTranslations();
    const el = exposeElement(expose);

    return () => {
      const category = props.category;
      const { list, requiredIds } = categories.value;
      const def = list.find((c) => c.id === category);
      const required = requiredIds.has(category);
      const { label, description } = categoryText(category, {
        translated: runtime.getCategoryText(category),
        configured: def,
        defaults: t.value.categories[category],
      });
      return h(
        "div",
        { ref: el, "data-cy-part": CY_PART.dialog.category, ...attrs },
        slots.default?.({
          category,
          label,
          description,
          // A required category is always on and can't be toggled.
          checked: required ? true : snapshot.value.categories[category] === true,
          disabled: required,
          toggle: (next: boolean) => {
            if (required) return;
            updateCategory(category, next);
          },
        } satisfies CategorySlotProps),
      );
    };
  },
}) as unknown as PartComponent<
  HTMLAttributes & { category: ConsentCategory },
  { default?: (props: CategorySlotProps) => unknown }
>;

const AcceptAll = defineAction({
  name: "Preferences.AcceptAll",
  part: CY_PART.dialog.acceptAll,
  source: "preferences",
  run: (actions) => actions.acceptAll,
  fallback: (t) => t.acceptAll,
});

const RejectAll = defineAction({
  name: "Preferences.RejectAll",
  part: CY_PART.dialog.rejectAll,
  source: "preferences",
  run: (actions) => actions.rejectAll,
  fallback: (t) => t.rejectAll,
});

const Save = defineAction({
  name: "Preferences.Save",
  part: CY_PART.dialog.save,
  source: "preferences",
  run: (actions) => actions.save,
  fallback: (t) => t.savePreferences,
});

const Branding = defineBranding("Preferences.Branding", CY_PART.dialog.branding);

/** The preferences dialog's parts. Compose them, or use `<CookiePreferences />`. */
export const Preferences: {
  Root: PartComponent<HTMLAttributes>;
  Title: PartComponent<HTMLAttributes>;
  Description: PartComponent<HTMLAttributes>;
  Intro: PartComponent<HTMLAttributes>;
  Close: ActionComponent;
  Categories: PartComponent<
    HTMLAttributes,
    { default?: (props: { category: ConsentCategory }) => unknown }
  >;
  Category: PartComponent<
    HTMLAttributes & { category: ConsentCategory },
    { default?: (props: CategorySlotProps) => unknown }
  >;
  AcceptAll: ActionComponent;
  RejectAll: ActionComponent;
  Save: ActionComponent;
  Branding: PartComponent<AnchorHTMLAttributes>;
} = {
  Root,
  Title,
  Description,
  Intro,
  Close,
  Categories,
  Category,
  AcceptAll,
  RejectAll,
  Save,
  Branding,
};
