"use client";

import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { BrandingLink } from "../components/BrandingLink.js";
import { CrossIcon } from "../components/icons.js";
import { useBannerVisibility } from "../hooks/useBannerVisibility.js";
import { useConsentActions } from "../hooks/useConsentActions.js";
import { useRegulation } from "../hooks/useRegulation.js";
import { useThemeConfig } from "../hooks/useThemeConfig.js";
import { useThemeVars } from "../hooks/useThemeVars.js";
import { useTranslations } from "../hooks/useTranslations.js";
import { CY_PART } from "../styles/parts.js";
import { renderAction } from "./Slot.js";
import {
  chain,
  composeRefs,
  OPT_OUT_DIALOG_ID,
  PREFERENCES_DIALOG_ID,
  useBodyPortalRoot,
} from "./utils.js";

type DivProps = ComponentPropsWithoutRef<"div">;
type ButtonProps = ComponentPropsWithoutRef<"button">;
type AnchorProps = ComponentPropsWithoutRef<"a">;
type ParagraphProps = ComponentPropsWithoutRef<"p">;
type HeadingProps = ComponentPropsWithoutRef<"h2">;

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

  // Was the banner already on screen the last time we rendered?
  //
  // This exists because the banner's DOM node is replaced once, shortly after
  // hydration: it is server-rendered inline (React cannot server-render a
  // portal), then `useBodyPortalRoot` resolves and React re-renders through
  // `createPortal`, discarding the original node and building a fresh one under
  // <body>. The replacement re-runs the CSS entry animation, so the banner fades
  // in a second time — invisible on a fast machine, where the swap lands inside
  // the 200ms fade, but plainly visible on a slow device, where hydration can
  // land a second later and the visitor sees an already-visible banner disappear
  // and fade back in.
  //
  // The swap itself is harmless; re-animating is the defect. So: animate when the
  // banner genuinely *appears*, and skip the entry animation when this mount is
  // only the re-parent of a banner that was already visible. The ref survives the
  // re-render because it belongs to this component instance, which never
  // unmounts — only its host element changes. Resetting it whenever the banner
  // hides means a later reappearance (e.g. after `resetConsent`) animates
  // normally.
  const wasVisible = useRef(false);
  const isReparent = visible && wasVisible.current;
  useEffect(() => {
    // Closed by a decision or the X: the focused button went with it, so hand focus
    // to the revisit button. No-op when a dialog opened instead: the revisit button
    // is not rendered then, and the dialog moves focus itself.
    if (wasVisible.current && !visible && document.activeElement === document.body) {
      document.querySelector<HTMLElement>(".cy-widget")?.focus();
    }
    wasVisible.current = visible;
  }, [visible]);

  if (!visible) return null;

  // Neutral grouping element (the preset gives it `display: contents`). The
  // dialog role / aria / canonical `data-cky-banner` live on the visible card
  // so the identified, measurable banner element equals what the user sees.
  // Callers can still pass `role` and other attributes via props.
  const content = (
    <div
      ref={composeRefs(containerRef, ref)}
      data-cy-part={CY_PART.banner.root}
      // Suppresses the entry animation on the card below — see `wasVisible`.
      {...(isReparent ? { "data-cy-entered": "" } : {})}
      {...props}
    >
      {children}
    </div>
  );

  return portalRoot ? createPortal(content, portalRoot) : content;
});

/** Titles the dialog the banner renders as; `Preferences.Title` and `OptOut.Title` match. */
const Title = forwardRef<HTMLHeadingElement, HeadingProps>(function BannerTitle(
  { children, ...props },
  ref,
) {
  const t = useTranslations();
  return (
    <h2 ref={ref} data-cy-part={CY_PART.banner.title} {...props}>
      {children ?? t.bannerTitle}
    </h2>
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
  return renderAction(asChild, ref, behavior, children, t.acceptAll);
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
  return renderAction(asChild, ref, behavior, children, t.rejectAll);
});

const OpenPreferences = forwardRef<HTMLButtonElement, ActionProps>(function BannerOpenPreferences(
  { children, onClick, asChild, ...rest },
  ref,
) {
  const { showPreferences } = useConsentActions();
  const t = useTranslations();
  const behavior = {
    "data-cy-part": CY_PART.banner.customise,
    "aria-haspopup": "dialog" as const,
    "aria-controls": PREFERENCES_DIALOG_ID,
    onClick: chain(onClick, showPreferences),
    ...rest,
  };
  return renderAction(asChild, ref, behavior, children, t.managePreferences);
});

const Close = forwardRef<HTMLButtonElement, ActionProps>(function BannerClose(
  { children, onClick, "aria-label": ariaLabel, asChild, ...rest },
  ref,
) {
  const { dismissBanner } = useConsentActions();
  const t = useTranslations();
  const behavior = {
    "aria-label": ariaLabel ?? t.bannerCloseLabel,
    "data-cy-part": CY_PART.banner.close,
    // Only closes: no consent is saved, granted or denied.
    onClick: chain(onClick, dismissBanner),
    ...rest,
  };
  return renderAction(asChild, ref, behavior, children, <CrossIcon size={9} />);
});

const DoNotSell = forwardRef<HTMLButtonElement, ActionProps>(function BannerDoNotSell(
  { children, onClick, asChild, ...rest },
  ref,
) {
  const { showOptOut } = useConsentActions();
  const t = useTranslations();
  const behavior = {
    "data-cy-part": CY_PART.banner.doNotSell,
    "aria-haspopup": "dialog" as const,
    "aria-controls": OPT_OUT_DIALOG_ID,
    onClick: chain(onClick, showOptOut),
    ...rest,
  };
  return renderAction(asChild, ref, behavior, children, t.doNotSell);
});

const Branding = forwardRef<HTMLAnchorElement, AnchorProps>(function BannerBranding(props, ref) {
  return <BrandingLink ref={ref} data-cy-part={CY_PART.banner.branding} {...props} />;
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
