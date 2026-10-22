"use client";

import { CY_PART, isRecallVisible } from "@cookieyes/ui";
import { type ComponentPropsWithoutRef, forwardRef, type ReactNode, useRef } from "react";
import { createPortal } from "react-dom";
import { RevisitIcon } from "../components/icons.js";
import { useConsent } from "../hooks/useConsent.js";
import { useConsentActions } from "../hooks/useConsentActions.js";
import { useRegulation } from "../hooks/useRegulation.js";
import { useThemeConfig } from "../hooks/useThemeConfig.js";
import { useThemeVars } from "../hooks/useThemeVars.js";
import { useTranslations } from "../hooks/useTranslations.js";
import { chain, composeRefs, useBodyPortalRoot } from "../primitives/utils.js";

export type RecallButtonProps = ComponentPropsWithoutRef<"button"> & { children?: ReactNode };

export const RecallButton = forwardRef<HTMLButtonElement, RecallButtonProps>(function RecallButton(
  { children, onClick, className, ...rest },
  ref,
) {
  const snapshot = useConsent();
  const regulation = useRegulation();
  const { showPreferences, showOptOut } = useConsentActions();
  const portalRoot = useBodyPortalRoot();
  const containerRef = useRef<HTMLButtonElement | null>(null);
  const { theme, colorScheme } = useThemeConfig();
  const t = useTranslations();
  useThemeVars(containerRef, theme, colorScheme);

  if (!isRecallVisible(snapshot, regulation)) return null;

  const onActivate = regulation === "CCPA" ? showOptOut : showPreferences;

  const button = (
    <button
      ref={composeRefs(containerRef, ref)}
      type="button"
      aria-label={t.recallButtonLabel}
      aria-haspopup="dialog"
      className={className ?? "cy-widget"}
      data-cy-part={CY_PART.recall.root}
      data-pos="bottom-left"
      data-tooltip={t.recallButtonLabel}
      onClick={chain(onClick, onActivate)}
      {...rest}
    >
      {children ?? <RevisitIcon />}
    </button>
  );

  return portalRoot ? createPortal(button, portalRoot) : button;
});
