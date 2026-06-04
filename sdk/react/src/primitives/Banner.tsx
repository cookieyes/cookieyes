"use client";

import { type ComponentPropsWithoutRef, forwardRef, type ReactNode } from "react";
import { CookieYesLogo } from "../components/icons.js";
import { useBannerVisibility } from "../hooks/useBannerVisibility.js";
import { useConsentActions } from "../hooks/useConsentActions.js";
import { useRegulation } from "../hooks/useRegulation.js";
import { useTranslations } from "../hooks/useTranslations.js";
import { chain } from "./utils.js";

type DivProps = ComponentPropsWithoutRef<"div">;
type ButtonProps = ComponentPropsWithoutRef<"button">;
type AnchorProps = ComponentPropsWithoutRef<"a">;
type ParagraphProps = ComponentPropsWithoutRef<"p">;

const Root = forwardRef<HTMLDivElement, DivProps & { children?: ReactNode }>(function BannerRoot(
  { children, ...props },
  ref,
) {
  const visible = useBannerVisibility();
  if (!visible) return null;
  return (
    <div ref={ref} role="dialog" aria-modal="false" aria-live="polite" {...props}>
      {children}
    </div>
  );
});

const Title = forwardRef<HTMLParagraphElement, ParagraphProps>(function BannerTitle(
  { children, ...props },
  ref,
) {
  const t = useTranslations();
  return (
    <p ref={ref} {...props}>
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
    <p ref={ref} {...props}>
      {children ?? (reg === "CCPA" ? t.ccpaDescription : t.bannerDescription)}
    </p>
  );
});

const Actions = forwardRef<HTMLDivElement, DivProps>(function BannerActions(props, ref) {
  return <div ref={ref} {...props} />;
});

const AcceptAll = forwardRef<HTMLButtonElement, ButtonProps>(function BannerAcceptAll(
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

const RejectAll = forwardRef<HTMLButtonElement, ButtonProps>(function BannerRejectAll(
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

const OpenPreferences = forwardRef<HTMLButtonElement, ButtonProps>(function BannerOpenPreferences(
  { children, onClick, ...rest },
  ref,
) {
  const { showPreferences } = useConsentActions();
  const t = useTranslations();
  return (
    <button ref={ref} type="button" onClick={chain(onClick, showPreferences)} {...rest}>
      {children ?? t.managePreferences}
    </button>
  );
});

const Close = forwardRef<HTMLButtonElement, ButtonProps>(function BannerClose(
  { children, onClick, "aria-label": ariaLabel, ...rest },
  ref,
) {
  const { acceptAll } = useConsentActions();
  return (
    <button
      ref={ref}
      type="button"
      aria-label={ariaLabel ?? "Close"}
      onClick={chain(onClick, acceptAll)}
      {...rest}
    >
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

const DoNotSell = forwardRef<HTMLButtonElement, ButtonProps>(function BannerDoNotSell(
  { children, onClick, ...rest },
  ref,
) {
  const { showOptOut } = useConsentActions();
  const t = useTranslations();
  return (
    <button ref={ref} type="button" onClick={chain(onClick, showOptOut)} {...rest}>
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
