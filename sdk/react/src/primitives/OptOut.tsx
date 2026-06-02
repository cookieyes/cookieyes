"use client";

import {
  type ComponentPropsWithoutRef,
  createContext,
  forwardRef,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CookieYesLogo } from "../components/icons.js";
import { useConsent } from "../hooks/useConsent.js";
import { useConsentActions } from "../hooks/useConsentActions.js";
import { useOptOutOpen } from "../hooks/useOptOutOpen.js";
import { useTranslations } from "../hooks/useTranslations.js";
import { chain, useEscapeKey, useFocusTrap } from "./utils.js";

type DivProps = ComponentPropsWithoutRef<"div">;
type ButtonProps = ComponentPropsWithoutRef<"button">;
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
  const isCurrentlyOptedOut = snapshot.categories.analytics !== true;
  const [optOut, setOptOut] = useState(isCurrentlyOptedOut);
  const [saved, setSaved] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  useEscapeKey(open, hideOptOut);
  useFocusTrap(open, containerRef);

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
    <OptOutContext.Provider value={{ optOut, setOptOut, saved, setSaved, secondsLeft }}>
      <div
        ref={(node) => {
          containerRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Opt-out preferences"
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
  const t = useTranslations();
  return (
    <h2 ref={ref} {...props}>
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
    <p ref={ref} {...props}>
      {children ?? t.optOut.description}
    </p>
  );
});

const Close = forwardRef<HTMLButtonElement, ButtonProps>(function OptOutClose(
  { children, onClick, "aria-label": ariaLabel, ...rest },
  ref,
) {
  const { hideOptOut } = useConsentActions();
  return (
    <button
      ref={ref}
      type="button"
      aria-label={ariaLabel ?? "Close"}
      onClick={chain(onClick, hideOptOut)}
      {...rest}
    >
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

const Cancel = forwardRef<HTMLButtonElement, ButtonProps>(function OptOutCancel(
  { children, onClick, ...rest },
  ref,
) {
  const { hideOptOut } = useConsentActions();
  const t = useTranslations();
  return (
    <button ref={ref} type="button" onClick={chain(onClick, hideOptOut)} {...rest}>
      {children ?? t.optOut.cancel}
    </button>
  );
});

const Save = forwardRef<HTMLButtonElement, ButtonProps>(function OptOutSave(
  { children, onClick, ...rest },
  ref,
) {
  const { optOut, setSaved } = useOptOutContext();
  const { acceptAll, rejectAll } = useConsentActions();
  const t = useTranslations();

  return (
    <button
      ref={ref}
      type="button"
      onClick={chain(onClick, () => {
        if (optOut) rejectAll();
        else acceptAll();
        setSaved(true);
      })}
      {...rest}
    >
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
  if (!saved) return null;
  const countdown = t.optOut.successCountdown.split("{seconds}");
  return (
    <div ref={ref} role="status" tabIndex={-1} {...props}>
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
        <div className="cy-optout-success-subtext-wrapper">
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
