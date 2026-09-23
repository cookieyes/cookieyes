"use client";

import {
  type ComponentPropsWithoutRef,
  createContext,
  forwardRef,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { CookieYesLogo } from "../components/icons.js";
import { useConsent } from "../hooks/useConsent.js";
import { useConsentActions } from "../hooks/useConsentActions.js";
import { useOptOutOpen } from "../hooks/useOptOutOpen.js";
import { useThemeConfig } from "../hooks/useThemeConfig.js";
import { useThemeVars } from "../hooks/useThemeVars.js";
import { useTranslations } from "../hooks/useTranslations.js";
import { CY_PART } from "../styles/parts.js";
import { Slot } from "./Slot.js";
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

const COUNTDOWN_SECONDS = 10;

type OptOutContextValue = {
  optOut: boolean;
  setOptOut: (v: boolean) => void;
  saved: boolean;
  setSaved: (v: boolean) => void;
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
  const isCurrentlyOptedOut = snapshot.categories.analytics !== true;
  const [optOut, setOptOut] = useState(isCurrentlyOptedOut);
  const [saved, setSaved] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const { theme, colorScheme } = useThemeConfig();

  useEscapeKey(open, hideOptOut);
  useFocusTrap(open, containerRef);
  useAutoFocusDialog(open, containerRef);
  useThemeVars(containerRef, theme, colorScheme);

  useEffect(() => {
    if (open) {
      setOptOut(snapshot.categories.analytics !== true);
      setSaved(false);
      setSecondsLeft(COUNTDOWN_SECONDS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!saved) return;
    setSecondsLeft(COUNTDOWN_SECONDS);
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          hideOptOut();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [saved, hideOptOut]);

  if (!open) return null;

  return (
    <OptOutContext.Provider value={{ optOut, setOptOut, saved, setSaved, secondsLeft, titleId }}>
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
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M1 1L9 9M9 1L1 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
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
  if (asChild) {
    return (
      <Slot ref={ref} {...behavior}>
        {children}
      </Slot>
    );
  }
  return (
    <button ref={ref} type="button" {...behavior}>
      {children ?? t.optOut.cancel}
    </button>
  );
});

const Save = forwardRef<HTMLButtonElement, ActionProps>(function OptOutSave(
  { children, onClick, asChild, ...rest },
  ref,
) {
  const { optOut, setSaved } = useOptOutContext();
  const { acceptAll, rejectAll, hideOptOut } = useConsentActions();
  const t = useTranslations();

  const behavior = {
    "data-cy-part": CY_PART.optOut.confirm,
    // The success message confirms an opt-out only; saving without one just closes.
    onClick: chain(onClick, () => {
      if (optOut) {
        rejectAll();
        setSaved(true);
      } else {
        acceptAll();
        hideOptOut();
      }
    }),
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
      {children ?? t.savePreferences}
    </button>
  );
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
            <svg
              fill="none"
              height="20"
              viewBox="0 0 20 20"
              width="20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18.3333 9.23355V10.0002C18.3323 11.7972 17.7504 13.5458 16.6744 14.9851C15.5984 16.4244 14.086 17.4773 12.3628 17.9868C10.6395 18.4963 8.79768 18.4351 7.11202 17.8124C5.42636 17.1896 3.98717 16.0386 3.00909 14.5311C2.03101 13.0236 1.56645 11.2403 1.68469 9.44714C1.80293 7.65402 2.49763 5.94715 3.66519 4.58111C4.83275 3.21506 6.41061 2.26303 8.16345 1.867C9.91629 1.47097 11.7502 1.65216 13.3916 2.38355M18.3333 3.33355L9.99996 11.6752L7.49996 9.17521"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <div className="cy-optout-success-text">{t.optOut.successText}</div>
        </div>
        {/* Screen readers get the countdown as one fixed sentence, read once with the
            confirmation. The visible one below ticks every second, and `role="status"`
            would re-announce each tick, so it is hidden from them instead. */}
        <p style={VISUALLY_HIDDEN}>{countdown.join(`${COUNTDOWN_SECONDS}`)}</p>
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

const Branding = forwardRef<HTMLAnchorElement, AnchorProps>(function OptOutBranding(
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
      // Neither the visible text nor the logo says the link opens a new tab.
      aria-label={`${t.poweredBy} (${t.opensInNewTab})`}
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
