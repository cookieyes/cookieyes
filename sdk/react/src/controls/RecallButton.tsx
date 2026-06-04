"use client";

import { type ComponentPropsWithoutRef, forwardRef, type ReactNode } from "react";
import { RevisitIcon } from "../components/icons.js";
import { useBannerVisibility } from "../hooks/useBannerVisibility.js";
import { useConsent } from "../hooks/useConsent.js";
import { useConsentActions } from "../hooks/useConsentActions.js";
import { useOptOutOpen } from "../hooks/useOptOutOpen.js";
import { usePreferencesOpen } from "../hooks/usePreferencesOpen.js";
import { useRegulation } from "../hooks/useRegulation.js";
import { chain } from "../primitives/utils.js";

type Props = ComponentPropsWithoutRef<"button"> & { children?: ReactNode };

export const RecallButton = forwardRef<HTMLButtonElement, Props>(function RecallButton(
  { children, onClick, className, ...rest },
  ref,
) {
  const bannerVisible = useBannerVisibility();
  const snapshot = useConsent();
  const preferencesOpen = usePreferencesOpen();
  const optOutOpen = useOptOutOpen();
  const regulation = useRegulation();
  const { showPreferences, showOptOut } = useConsentActions();

  if (bannerVisible) return null;
  if (preferencesOpen || optOutOpen) return null;
  if (!snapshot.hasActed && regulation !== "CCPA") return null;

  const onActivate = regulation === "CCPA" ? showOptOut : showPreferences;

  return (
    <button
      ref={ref}
      type="button"
      aria-label="Consent Preferences"
      className={className ?? "cy-widget"}
      data-cy-theme="system"
      data-pos="bottom-left"
      data-tooltip="Consent Preferences"
      onClick={chain(onClick, onActivate)}
      {...rest}
    >
      {children ?? <RevisitIcon />}
    </button>
  );
});
