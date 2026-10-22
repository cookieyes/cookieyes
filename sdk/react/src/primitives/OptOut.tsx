"use client";

import {
  CY_PART,
  initialOptOutState,
  OPT_OUT_COUNTDOWN_SECONDS,
  optOutReducer,
  startOptOutCountdown,
} from "@cookieyes/ui";
import {
  type ComponentPropsWithoutRef,
  createContext,
  forwardRef,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useReducer,
  useRef,
} from "react";
import { BrandingLink } from "../components/BrandingLink.js";
import { CrossIcon, SuccessIcon } from "../components/icons.js";
import { useConsent } from "../hooks/useConsent.js";
import { useConsentActions } from "../hooks/useConsentActions.js";
import { useOptOutOpen } from "../hooks/useOptOutOpen.js";
import { useThemeConfig } from "../hooks/useThemeConfig.js";
import { useThemeVars } from "../hooks/useThemeVars.js";
import { useTranslations } from "../hooks/useTranslations.js";
import { renderAction } from "./Slot.js";
import {
  chain,
  composeRefs,
  useAutoFocusDialog,
  useEscapeKey,
  useFocusTrap,
  VISUALLY_HIDDEN,
} from "./utils.js";

type DivProps = ComponentPropsWithoutRef<"div">;
type ButtonProps = ComponentPropsWithoutRef<"button">;

/** Button props plus `asChild` — render your own element and we wire behaviour onto it. */
type ActionProps = ButtonProps & { asChild?: boolean };
type AnchorProps = ComponentPropsWithoutRef<"a">;
type ParagraphProps = ComponentPropsWithoutRef<"p">;
type HeadingProps = ComponentPropsWithoutRef<"h2">;
type LabelProps = ComponentPropsWithoutRef<"label">;
type InputProps = Omit<ComponentPropsWithoutRef<"input">, "type" | "checked">;

type OptOutContextValue = {
  optOut: boolean;
  setOptOut: (v: boolean) => void;
  saved: boolean;
  /** Records that the opt-out was saved, which shows the confirmation. */
  setSaved: () => void;
  secondsLeft: number;
  /** Shared so the dialog can be named by its own visible heading. */
  titleId: string;
};

const OptOutContext = createContext<OptOutContextValue | null>(null);

function useOptOutContext(): OptOutContextValue {
  const ctx = useContext(OptOutContext);
  if (!ctx) {
    throw new Error("[cookieyes] OptOut.* sub-components must be rendered inside <OptOut.Root>.");
  }
  return ctx;
}

const Root = forwardRef<HTMLDivElement, DivProps & { children?: ReactNode }>(function OptOutRoot(
  { children, ...props },
  ref,
) {
  const open = useOptOutOpen();
  const snapshot = useConsent();
  const { hideOptOut } = useConsentActions();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const [state, dispatch] = useReducer(optOutReducer, snapshot.categories, initialOptOutState);
  const { theme, colorScheme } = useThemeConfig();

  useEscapeKey(open, hideOptOut);
  useFocusTrap(open, containerRef);
  useAutoFocusDialog(open, containerRef);
  useThemeVars(containerRef, theme, colorScheme);

  // biome-ignore lint/correctness/useExhaustiveDependencies: resets only when the dialog opens; the categories at that moment are the starting point, later changes are the visitor's own.
  useEffect(() => {
    if (open) dispatch({ type: "open", categories: snapshot.categories });
  }, [open]);

  useEffect(() => {
    if (!state.confirmed) return;
    return startOptOutCountdown(
      (secondsLeft) => dispatch({ type: "tick", secondsLeft }),
      hideOptOut,
    );
  }, [state.confirmed, hideOptOut]);

  if (!open) return null;

  const context: OptOutContextValue = {
    optOut: state.optedOut,
    setOptOut: (optedOut) => dispatch({ type: "toggle", optedOut }),
    saved: state.confirmed,
    setSaved: () => dispatch({ type: "confirm" }),
    secondsLeft: state.secondsLeft,
    titleId,
  };

  return (
    <OptOutContext.Provider value={context}>
      <div
        ref={composeRefs(containerRef, ref)}
        role="dialog"
        aria-modal="true"
        // Named by the heading the visitor can see, so the spoken and printed names match.
        aria-labelledby={titleId}
        tabIndex={-1}
        data-cy-part={CY_PART.optOut.root}
        {...props}
      >
        {children}
      </div>
    </OptOutContext.Provider>
  );
});

const Title = forwardRef<HTMLHeadingElement, HeadingProps>(function OptOutTitle(
  { children, ...props },
  ref,
) {
  const { titleId } = useOptOutContext();
  const t = useTranslations();
  return (
    <h2 id={titleId} ref={ref} data-cy-part={CY_PART.optOut.title} {...props}>
      {children ?? t.optOut.title}
    </h2>
  );
});

const Description = forwardRef<HTMLParagraphElement, ParagraphProps>(function OptOutDescription(
  { children, ...props },
  ref,
) {
  const t = useTranslations();
  return (
    <p ref={ref} data-cy-part={CY_PART.optOut.message} {...props}>
      {children ?? t.optOut.description}
    </p>
  );
});

const Close = forwardRef<HTMLButtonElement, ActionProps>(function OptOutClose(
  { children, onClick, "aria-label": ariaLabel, asChild, ...rest },
  ref,
) {
  const { hideOptOut } = useConsentActions();
  const t = useTranslations();
  const behavior = {
    "aria-label": ariaLabel ?? t.optOutCloseLabel,
    "data-cy-part": CY_PART.optOut.close,
    onClick: chain(onClick, hideOptOut),
    ...rest,
  };
  return renderAction(asChild, ref, behavior, children, <CrossIcon size={10} />);
});

const Checkbox = forwardRef<HTMLInputElement, InputProps>(function OptOutCheckbox(
  { onChange, disabled, ...rest },
  ref,
) {
  const { optOut, setOptOut, saved } = useOptOutContext();
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={optOut}
      disabled={disabled ?? saved}
      onChange={(e) => {
        onChange?.(e);
        if (!e.defaultPrevented) setOptOut(e.target.checked);
      }}
      {...rest}
    />
  );
});

const CheckboxLabel = forwardRef<HTMLLabelElement, LabelProps>(function OptOutCheckboxLabel(
  { children, ...props },
  ref,
) {
  const t = useTranslations();
  return (
    <label ref={ref} {...props}>
      {children ?? t.doNotSell}
    </label>
  );
});

const Cancel = forwardRef<HTMLButtonElement, ActionProps>(function OptOutCancel(
  { children, onClick, asChild, ...rest },
  ref,
) {
  const { hideOptOut } = useConsentActions();
  const t = useTranslations();
  const behavior = { onClick: chain(onClick, hideOptOut), ...rest };
  return renderAction(asChild, ref, behavior, children, t.optOut.cancel);
});

const Save = forwardRef<HTMLButtonElement, ActionProps>(function OptOutSave(
  { children, onClick, asChild, ...rest },
  ref,
) {
  const { optOut, setSaved } = useOptOutContext();
  const { acceptAll, rejectAll, hideOptOut } = useConsentActions("optout");
  const t = useTranslations();

  const behavior = {
    "data-cy-part": CY_PART.optOut.confirm,
    // The success message confirms an opt-out only; saving without one just closes.
    onClick: chain(onClick, () => {
      if (optOut) {
        rejectAll();
        setSaved();
      } else {
        acceptAll();
        hideOptOut();
      }
    }),
    ...rest,
  };
  return renderAction(asChild, ref, behavior, children, t.savePreferences);
});

const Buttons = forwardRef<HTMLDivElement, DivProps & { children?: ReactNode }>(
  function OptOutButtons({ children, ...props }, ref) {
    const { saved } = useOptOutContext();
    if (saved) return null;
    return (
      <div ref={ref} {...props}>
        {children}
      </div>
    );
  },
);

const Success = forwardRef<HTMLDivElement, DivProps>(function OptOutSuccess(props, ref) {
  const { saved, secondsLeft } = useOptOutContext();
  const t = useTranslations();
  const innerRef = useRef<HTMLDivElement | null>(null);
  // The focused Save button is gone once saved. Move focus here, so the confirmation
  // is read and keyboard users keep their place inside the dialog.
  useEffect(() => {
    if (saved) innerRef.current?.focus();
  }, [saved]);
  if (!saved) return null;
  const countdown = t.optOut.successCountdown.split("{seconds}");
  return (
    <div ref={composeRefs(innerRef, ref)} role="status" tabIndex={-1} {...props}>
      <div className="cy-optout-success-inner">
        <div className="cy-optout-success-row">
          <div className="cy-optout-success-icon" aria-hidden="true">
            <SuccessIcon />
          </div>
          <div className="cy-optout-success-text">
            {t.optOut.successText}
            {/* Screen readers get the countdown as one fixed sentence, in the same text
                as the confirmation so both are read together. The visible one below
                ticks every second, and `role="status"` would re-announce each tick, so
                it is hidden from them instead. */}
            <span style={VISUALLY_HIDDEN}>
              {" " + countdown.join(`${OPT_OUT_COUNTDOWN_SECONDS}`)}
            </span>
          </div>
        </div>
        <div className="cy-optout-success-subtext-wrapper" aria-hidden="true">
          <p className="cy-optout-success-subtext">
            {countdown[0]}
            <span className="cy-optout-countdown">{secondsLeft}</span>
            {countdown[1] ?? ""}
          </p>
        </div>
      </div>
    </div>
  );
});

const Branding = forwardRef<HTMLAnchorElement, AnchorProps>(function OptOutBranding(props, ref) {
  return <BrandingLink ref={ref} {...props} />;
});

export const OptOut = {
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

export { useOptOutContext };
