"use client";

import type { ConsentCategory } from "@cookieyes/core";
import {
  type ComponentPropsWithoutRef,
  createContext,
  forwardRef,
  type ReactNode,
  useContext,
  useRef,
} from "react";
import { CookieYesLogo } from "../components/icons.js";
import { useConsent } from "../hooks/useConsent.js";
import { useConsentActions } from "../hooks/useConsentActions.js";
import { usePreferencesOpen } from "../hooks/usePreferencesOpen.js";
import { useTranslations } from "../hooks/useTranslations.js";
import { chain, useEscapeKey, useFocusTrap } from "./utils.js";

type DivProps = ComponentPropsWithoutRef<"div">;
type ButtonProps = ComponentPropsWithoutRef<"button">;
type AnchorProps = ComponentPropsWithoutRef<"a">;
type ParagraphProps = ComponentPropsWithoutRef<"p">;
type HeadingProps = ComponentPropsWithoutRef<"h2">;

const CATEGORY_ORDER: ConsentCategory[] = [
  "necessary",
  "functional",
  "analytics",
  "performance",
  "advertisement",
];

type PreferencesContextValue = {
  containerRef: React.RefObject<HTMLDivElement | null>;
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

    useEscapeKey(open, hidePreferences);
    useFocusTrap(open, containerRef);

    if (!open) return null;

    return (
      <PreferencesContext.Provider value={{ containerRef }}>
        <div
          ref={(node) => {
            containerRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Cookie preferences"
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
  const t = useTranslations();
  return (
    <h2 ref={ref} {...props}>
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
    <p ref={ref} {...props}>
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

const Close = forwardRef<HTMLButtonElement, ButtonProps>(function PreferencesClose(
  { children, onClick, "aria-label": ariaLabel, ...rest },
  ref,
) {
  const { hidePreferences } = useConsentActions();
  return (
    <button
      ref={ref}
      type="button"
      aria-label={ariaLabel ?? "Close preferences"}
      onClick={chain(onClick, hidePreferences)}
      {...rest}
    >
      {children ?? (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M1 1L11 11M11 1L1 11"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
});

const Categories = forwardRef<
  HTMLDivElement,
  Omit<DivProps, "children"> & {
    children: (category: ConsentCategory) => ReactNode;
  }
>(function PreferencesCategories({ children, ...props }, ref) {
  return (
    <div ref={ref} role="list" {...props}>
      {CATEGORY_ORDER.map((cat) => (
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
  const t = useTranslations();
  const isNecessary = category === "necessary";
  const checked = isNecessary ? true : snapshot.categories[category] === true;
  return (
    <div ref={ref} {...props}>
      {children({
        category,
        label: t.categories[category].label,
        description: t.categories[category].description,
        checked,
        disabled: isNecessary,
        toggle: (next) => {
          if (isNecessary) return;
          updateCategory(category, next);
        },
      })}
    </div>
  );
});

const AcceptAll = forwardRef<HTMLButtonElement, ButtonProps>(function PreferencesAcceptAll(
  { children, onClick, ...rest },
  ref,
) {
  const { acceptAll } = useConsentActions();
  const t = useTranslations();
  return (
    <button ref={ref} type="button" onClick={chain(onClick, acceptAll)} {...rest}>
      {children ?? t.acceptAll}
    </button>
  );
});

const RejectAll = forwardRef<HTMLButtonElement, ButtonProps>(function PreferencesRejectAll(
  { children, onClick, ...rest },
  ref,
) {
  const { rejectAll } = useConsentActions();
  const t = useTranslations();
  return (
    <button ref={ref} type="button" onClick={chain(onClick, rejectAll)} {...rest}>
      {children ?? t.rejectAll}
    </button>
  );
});

const Save = forwardRef<HTMLButtonElement, ButtonProps>(function PreferencesSave(
  { children, onClick, ...rest },
  ref,
) {
  const { save } = useConsentActions();
  const t = useTranslations();
  return (
    <button ref={ref} type="button" onClick={chain(onClick, save)} {...rest}>
      {children ?? t.savePreferences}
    </button>
  );
});

const Branding = forwardRef<HTMLAnchorElement, AnchorProps>(function PreferencesBranding(
  { children, ...props },
  ref,
) {
  const t = useTranslations();
  return (
    <a
      ref={ref}
      href="https://www.cookieyes.com"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.poweredBy}
      {...props}
    >
      {children ?? (
        <>
          Powered by <CookieYesLogo />
        </>
      )}
    </a>
  );
});

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
