"use client";

import { type ComponentPropsWithoutRef, forwardRef, type ReactNode, useRef } from "react";
import { createPortal } from "react-dom";
import { CookieYesLogo } from "../components/icons.js";
import { useBannerVisibility } from "../hooks/useBannerVisibility.js";
import { useConsentActions } from "../hooks/useConsentActions.js";
import { useRegulation } from "../hooks/useRegulation.js";
import { useThemeConfig } from "../hooks/useThemeConfig.js";
import { useThemeVars } from "../hooks/useThemeVars.js";
import { useTranslations } from "../hooks/useTranslations.js";
import { CY_PART } from "../styles/parts.js";
import { Slot } from "./Slot.js";
import { chain, useBodyPortalRoot } from "./utils.js";

type DivProps = ComponentPropsWithoutRef<"div">;
type ButtonProps = ComponentPropsWithoutRef<"button">;
type AnchorProps = ComponentPropsWithoutRef<"a">;
type ParagraphProps = ComponentPropsWithoutRef<"p">;

/** Button props plus `asChild` — render your own element and we wire behaviour onto it. */
type ActionProps = ButtonProps & { asChild?: boolean };

const Root = forwardRef<HTMLDivElement, DivProps & { children?: ReactNode }>(function BannerRoot(
  { children, ...props },
  ref,
) {
  const visible = useBannerVisibility();
  const portalRoot = useBodyPortalRoot();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { theme, colorScheme } = useThemeConfig();
  useThemeVars(containerRef, theme, colorScheme);

  if (!visible) return null;

  // Neutral grouping element (the preset gives it `display: contents`). The
  // dialog role / aria / canonical `data-cky-banner` live on the visible card
  // so the identified, measurable banner element equals what the user sees.
  // Callers can still pass `role` and other attributes via props.
  const content = (
    <div
      ref={(node) => {
        containerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      data-cy-part={CY_PART.banner.root}
      {...props}
    >
      {children}
    </div>
  );

  return portalRoot ? createPortal(content, portalRoot) : content;
});

const Title = forwardRef<HTMLParagraphElement, ParagraphProps>(function BannerTitle(
  { children, ...props },
  ref,
) {
  const t = useTranslations();
  return (
    <p ref={ref} data-cy-part={CY_PART.banner.title} {...props}>
      {children ?? t.bannerTitle}
    </p>
  );
});

const Description = forwardRef<HTMLParagraphElement, ParagraphProps>(function BannerDescription(
  { children, ...props },
  ref,
) {
  const t = useTranslations();
  const reg = useRegulation();
  return (
    <p ref={ref} data-cy-part={CY_PART.banner.description} {...props}>
      {children ?? (reg === "CCPA" ? t.ccpaDescription : t.bannerDescription)}
    </p>
  );
});

const Actions = forwardRef<HTMLDivElement, DivProps>(function BannerActions(props, ref) {
  return <div ref={ref} data-cy-part={CY_PART.banner.actions} {...props} />;
});

const AcceptAll = forwardRef<HTMLButtonElement, ActionProps>(function BannerAcceptAll(
  { children, onClick, asChild, ...rest },
  ref,
) {
  const { acceptAll } = useConsentActions();
  const t = useTranslations();
  const behavior = {
    "data-cy-part": CY_PART.banner.acceptAll,
    onClick: chain(onClick, acceptAll),
    ...rest,
  };
  if (asChild) {
    return (
      <Slot ref={ref} {...behavior}>
        {children}
      </Slot>
    );
  }
  return (
    <button ref={ref} type="button" {...behavior}>
      {children ?? t.acceptAll}
    </button>
  );
});

const RejectAll = forwardRef<HTMLButtonElement, ActionProps>(function BannerRejectAll(
  { children, onClick, asChild, ...rest },
  ref,
) {
  const { rejectAll } = useConsentActions();
  const t = useTranslations();
  const behavior = {
    "data-cy-part": CY_PART.banner.rejectAll,
    onClick: chain(onClick, rejectAll),
    ...rest,
  };
  if (asChild) {
    return (
      <Slot ref={ref} {...behavior}>
        {children}
      </Slot>
    );
  }
  return (
    <button ref={ref} type="button" {...behavior}>
      {children ?? t.rejectAll}
    </button>
  );
});

const OpenPreferences = forwardRef<HTMLButtonElement, ActionProps>(function BannerOpenPreferences(
  { children, onClick, asChild, ...rest },
  ref,
) {
  const { showPreferences } = useConsentActions();
  const t = useTranslations();
  const behavior = {
    "data-cy-part": CY_PART.banner.customise,
    onClick: chain(onClick, showPreferences),
    ...rest,
  };
  if (asChild) {
    return (
      <Slot ref={ref} {...behavior}>
        {children}
      </Slot>
    );
  }
  return (
    <button ref={ref} type="button" {...behavior}>
      {children ?? t.managePreferences}
    </button>
  );
});

const Close = forwardRef<HTMLButtonElement, ActionProps>(function BannerClose(
  { children, onClick, "aria-label": ariaLabel, asChild, ...rest },
  ref,
) {
  const { acceptAll } = useConsentActions();
  const behavior = {
    "aria-label": ariaLabel ?? "Close",
    "data-cy-part": CY_PART.banner.close,
    onClick: chain(onClick, acceptAll),
    ...rest,
  };
  if (asChild) {
    return (
      <Slot ref={ref} {...behavior}>
        {children}
      </Slot>
    );
  }
  return (
    <button ref={ref} type="button" {...behavior}>
      {children ?? (
        <svg
          width="9"
          height="9"
          viewBox="0 0 9 9"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M1 1L8 8M8 1L1 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
});

const DoNotSell = forwardRef<HTMLButtonElement, ActionProps>(function BannerDoNotSell(
  { children, onClick, asChild, ...rest },
  ref,
) {
  const { showOptOut } = useConsentActions();
  const t = useTranslations();
  const behavior = {
    "data-cy-part": CY_PART.banner.doNotSell,
    onClick: chain(onClick, showOptOut),
    ...rest,
  };
  if (asChild) {
    return (
      <Slot ref={ref} {...behavior}>
        {children}
      </Slot>
    );
  }
  return (
    <button ref={ref} type="button" {...behavior}>
      {children ?? t.doNotSell}
    </button>
  );
});

const Branding = forwardRef<HTMLAnchorElement, AnchorProps>(function BannerBranding(
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
      data-cy-part={CY_PART.banner.branding}
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

export const Banner = {
  Root,
  Title,
  Description,
  Actions,
  AcceptAll,
  RejectAll,
  OpenPreferences,
  Close,
  DoNotSell,
  Branding,
};
