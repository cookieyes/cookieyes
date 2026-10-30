import { _clearStopHandlers, type CookieYesConfig } from "@cookieyes/core";
import {
  CookieBanner,
  CookieOptOut,
  CookiePreferences,
  getCookieYes,
  initCookieYes,
  RecallButton,
  ReloadNotice,
  resetCookieYes,
} from "@cookieyes/react";
import { act, cleanup, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ConformanceDriver } from "../conformance.js";

function reset(): void {
  cleanup();
  resetCookieYes();
  _clearStopHandlers();
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
  document.getElementById("cookieyes-portal-root")?.remove();
}

/**
 * The React adapter as a conformance driver. How a click and a key press are
 * delivered is the caller's: simulated in jsdom, real in a browser.
 */
export function reactDriver(
  name: string,
  input: Pick<ConformanceDriver, "click" | "press">,
): ConformanceDriver {
  return {
    name,
    mount(config: CookieYesConfig) {
      initCookieYes(config);
      render(
        <>
          <CookieBanner />
          <CookiePreferences />
          <CookieOptOut />
          <ReloadNotice />
          <RecallButton />
        </>,
      );
    },
    unmount: reset,
    async setLanguage(tag) {
      await act(async () => {
        await getCookieYes().setLanguage(tag);
      });
    },
    ...input,
    serverHtml(config) {
      initCookieYes(config);
      try {
        return renderToStaticMarkup(<CookieBanner />);
      } finally {
        reset();
      }
    },
  };
}
