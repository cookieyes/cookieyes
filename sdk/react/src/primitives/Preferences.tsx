"use client";

import type { ConsentCategory } from "@cookieyes/core";
import {
  type ComponentPropsWithoutRef,
  createContext,
  forwardRef,
  type ReactNode,
  useContext,
  useId,
  useRef,
} from "react";
import { BrandingLink } from "../components/BrandingLink.js";
import { CrossIcon } from "../components/icons.js";
import { useCategories } from "../hooks/useCategories.js";
import { useConsent } from "../hooks/useConsent.js";
import { useConsentActions } from "../hooks/useConsentActions.js";
import { usePreferencesOpen } from "../hooks/usePreferencesOpen.js";
import { useThemeConfig } from "../hooks/useThemeConfig.js";
import { useThemeVars } from "../hooks/useThemeVars.js";
import { useTranslations } from "../hooks/useTranslations.js";
import { _tryGetCookieYes } from "../runtime.js";
import { CY_PART } from "../styles/parts.js";
import { renderAction } from "./Slot.js";
import {
  chain,
  composeRefs,
  PREFERENCES_DIALOG_ID,
  useAutoFocusDialog,
  useEscapeKey,
  useFocusTrap,
} from "./utils.js";

type DivProps = ComponentPropsWithoutRef<"div">;
type ButtonProps = ComponentPropsWithoutRef<"button">;

/** Button props plus `asChild` — render your own element and we wire behaviour onto it. */
type ActionProps = ButtonProps & { asChild?: boolean };
type AnchorProps = ComponentPropsWithoutRef<"a">;
type ParagraphProps = ComponentPropsWithoutRef<"p">;
type HeadingProps = ComponentPropsWithoutRef<"h2">;

type PreferencesContextValue = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Shared so the dialog can be named by its own visible heading. */
  titleId: string;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function usePreferencesContext(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error(
      "[cookieyes] Preferences.* sub-components must be rendered inside <Preferences.Root>.",
    );
  }
  return ctx;
}

const Root = forwardRef<HTMLDivElement, DivProps & { children?: ReactNode }>(
  function PreferencesRoot({ children, ...props }, ref) {
    const open = usePreferencesOpen();
    const { hidePreferences } = useConsentActions();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const titleId = useId();
    const { theme, colorScheme } = useThemeConfig();

    useEscapeKey(open, hidePreferences);
    useFocusTrap(open, containerRef);
    useAutoFocusDialog(open, containerRef);
    useThemeVars(containerRef, theme, colorScheme);

    if (!open) return null;

    return (
      <PreferencesContext.Provider value={{ containerRef, titleId }}>
        <div
          ref={composeRefs(containerRef, ref)}
          id={PREFERENCES_DIALOG_ID}
          role="dialog"
          aria-modal="true"
          // Named by the heading the visitor can see, so the spoken and printed names match.
          aria-labelledby={titleId}
          tabIndex={-1}
          data-cy-part={CY_PART.dialog.overlay}
          {...props}
        >
          {children}
        </div>
      </PreferencesContext.Provider>
    );
  },
);

const Title = forwardRef<HTMLHeadingElement, HeadingProps>(function PreferencesTitle(
  { children, ...props },
  ref,
) {
  const { titleId } = usePreferencesContext();
  const t = useTranslations();
  return (
    <h2 id={titleId} ref={ref} data-cy-part={CY_PART.dialog.title} {...props}>
      {children ?? t.preferencesTitle}
    </h2>
  );
});

const Intro = forwardRef<HTMLParagraphElement, ParagraphProps>(function PreferencesIntro(
  { children, ...props },
  ref,
) {
  const t = useTranslations();
  return (
    <p ref={ref} data-cy-part={CY_PART.dialog.intro} {...props}>
      {children ?? t.preferencesIntro}
    </p>
  );
});

const Description = forwardRef<HTMLParagraphElement, ParagraphProps>(
  function PreferencesDescription({ children, ...props }, ref) {
    return (
      <p ref={ref} {...props}>
        {children}
      </p>
    );
  },
);

const Close = forwardRef<HTMLButtonElement, ActionProps>(function PreferencesClose(
  { children, onClick, "aria-label": ariaLabel, asChild, ...rest },
  ref,
) {
  const { hidePreferences } = useConsentActions();
  const t = useTranslations();
  const behavior = {
    "aria-label": ariaLabel ?? t.preferencesCloseLabel,
    "data-cy-part": CY_PART.dialog.close,
    onClick: chain(onClick, hidePreferences),
    ...rest,
  };
  return renderAction(asChild, ref, behavior, children, <CrossIcon size={12} strokeWidth={1.8} />);
});

const Categories = forwardRef<
  HTMLDivElement,
  Omit<DivProps, "children"> & {
    children: (category: ConsentCategory) => ReactNode;
  }
>(function PreferencesCategories({ children, ...props }, ref) {
  // Iterate the *configured* taxonomy (custom list or built-in five fallback),
  // in declaration order.
  const { ids } = useCategories();
  return (
    <div ref={ref} role="list" {...props}>
      {ids.map((cat) => (
        <div key={cat} role="listitem">
          {children(cat)}
        </div>
      ))}
    </div>
  );
});

type CategoryRenderProps = {
  category: ConsentCategory;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  toggle: (next: boolean) => void;
};

const Category = forwardRef<
  HTMLDivElement,
  Omit<DivProps, "children"> & {
    category: ConsentCategory;
    children: (props: CategoryRenderProps) => ReactNode;
  }
>(function PreferencesCategory({ category, children, ...props }, ref) {
  const snapshot = useConsent();
  const { updateCategory } = useConsentActions();
  const { list, requiredIds } = useCategories();
  const t = useTranslations();

  const def = list.find((c) => c.id === category);
  const required = requiredIds.has(category);
  // A required category is always on and can't be toggled.
  const checked = required ? true : snapshot.categories[category] === true;

  // Text precedence: the active language's translation (if the customer gave
  // one) → the category's config label → the built-in English default → the id.
  // `getCategoryText` is the customer's own translation, kept apart from the
  // English defaults so it can win over the config label without English masking it.
  const translated = _tryGetCookieYes()?.getCategoryText(category);
  const fallback = t.categories[category];
  const label = translated?.label ?? def?.label ?? fallback?.label ?? category;
  const description = translated?.description ?? def?.description ?? fallback?.description ?? "";

  return (
    <div ref={ref} data-cy-part={CY_PART.dialog.category} {...props}>
      {children({
        category,
        label,
        description,
        checked,
        disabled: required,
        toggle: (next) => {
          if (required) return;
          updateCategory(category, next);
        },
      })}
    </div>
  );
});

const AcceptAll = forwardRef<HTMLButtonElement, ActionProps>(function PreferencesAcceptAll(
  { children, onClick, asChild, ...rest },
  ref,
) {
  const { acceptAll } = useConsentActions();
  const t = useTranslations();
  const behavior = {
    "data-cy-part": CY_PART.dialog.acceptAll,
    onClick: chain(onClick, acceptAll),
    ...rest,
  };
  return renderAction(asChild, ref, behavior, children, t.acceptAll);
});

const RejectAll = forwardRef<HTMLButtonElement, ActionProps>(function PreferencesRejectAll(
  { children, onClick, asChild, ...rest },
  ref,
) {
  const { rejectAll } = useConsentActions();
  const t = useTranslations();
  const behavior = {
    "data-cy-part": CY_PART.dialog.rejectAll,
    onClick: chain(onClick, rejectAll),
    ...rest,
  };
  return renderAction(asChild, ref, behavior, children, t.rejectAll);
});

const Save = forwardRef<HTMLButtonElement, ActionProps>(function PreferencesSave(
  { children, onClick, asChild, ...rest },
  ref,
) {
  const { save } = useConsentActions();
  const t = useTranslations();
  const behavior = {
    "data-cy-part": CY_PART.dialog.save,
    onClick: chain(onClick, save),
    ...rest,
  };
  return renderAction(asChild, ref, behavior, children, t.savePreferences);
});

const Branding = forwardRef<HTMLAnchorElement, AnchorProps>(
  function PreferencesBranding(props, ref) {
    return <BrandingLink ref={ref} data-cy-part={CY_PART.dialog.branding} {...props} />;
  },
);

export const Preferences = {
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

export { usePreferencesContext };
