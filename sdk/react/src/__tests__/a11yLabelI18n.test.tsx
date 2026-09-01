import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GatedFrame } from "../controls/GatedFrame.js";
import { RecallButton } from "../controls/RecallButton.js";
import { CookiePreferences } from "../presets/CookiePreferences.js";
import { getCookieYes, initCookieYes, resetCookieYes } from "../runtime.js";
import { clearCookie } from "./test-utils.js";

/**
 * These nine strings were hardcoded English until now, so a fully translated site
 * still announced itself in English to screen reader users and showed English text
 * inside an otherwise translated interface. They are the visible "Always Active"
 * label, the accessible names of the preferences dialog, the opt-out dialog and the
 * recall button, both halves of GatedFrame's blocked-content placeholder, and the
 * accessible names of the three close buttons. The close buttons matter most of the
 * three groups: each renders only an aria-hidden icon, so the label IS the button's
 * entire accessible name — a screen reader had nothing else to announce.
 *
 * TypeScript already guarantees every shipped language *supplies* the keys — each
 * language file is typed `TranslationMap`, so a missing key fails the build. What
 * it cannot guarantee is that the components actually *read* them, which is the
 * regression these tests exist to catch.
 */

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  resetCookieYes();
  clearCookie();
});

describe("accessible labels are translatable", () => {
  it('renders "Always Active" from translations, not a hardcoded string', () => {
    initCookieYes({
      mode: "cookie-only",
      i18n: { messages: { de: { alwaysActive: "Immer aktiv" } } },
    });
    act(() => getCookieYes().manager.showPreferences());
    render(<CookiePreferences />);

    expect(document.body.textContent).toContain("Always Active");

    act(() => {
      void getCookieYes().setLanguage("de");
    });

    expect(document.body.textContent).toContain("Immer aktiv");
    expect(document.body.textContent).not.toContain("Always Active");
  });

  it("takes the preferences dialog's accessible name from translations", () => {
    initCookieYes({
      mode: "cookie-only",
      i18n: { messages: { de: { preferencesDialogLabel: "Cookie-Einstellungen" } } },
    });
    act(() => getCookieYes().manager.showPreferences());
    render(<CookiePreferences />);

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute("aria-label")).toBe("Cookie preferences");

    act(() => {
      void getCookieYes().setLanguage("de");
    });

    expect(document.querySelector('[role="dialog"]')?.getAttribute("aria-label")).toBe(
      "Cookie-Einstellungen",
    );
  });

  it("takes the recall button's accessible name and tooltip from translations", () => {
    initCookieYes({
      mode: "cookie-only",
      i18n: { messages: { de: { recallButtonLabel: "Zustimmungseinstellungen" } } },
    });
    // The recall button stays hidden until the visitor has acted under GDPR.
    act(() => getCookieYes().manager.acceptAll());
    render(<RecallButton />);

    const before = document.querySelector(".cy-widget");
    expect(before?.getAttribute("aria-label")).toBe("Consent Preferences");
    // Both attributes read the same key — the tooltip was hardcoded separately.
    expect(before?.getAttribute("data-tooltip")).toBe("Consent Preferences");

    act(() => {
      void getCookieYes().setLanguage("de");
    });

    const after = document.querySelector(".cy-widget");
    expect(after?.getAttribute("aria-label")).toBe("Zustimmungseinstellungen");
    expect(after?.getAttribute("data-tooltip")).toBe("Zustimmungseinstellungen");
  });

  it("takes the preferences dialog's close-button label from translations", () => {
    initCookieYes({
      mode: "cookie-only",
      i18n: { messages: { de: { preferencesCloseLabel: "Einstellungen schließen" } } },
    });
    act(() => getCookieYes().manager.showPreferences());
    render(<CookiePreferences />);

    const close = () => document.querySelector('[data-cy-part="close"]');
    expect(close()?.getAttribute("aria-label")).toBe("Close preferences");

    act(() => {
      void getCookieYes().setLanguage("de");
    });

    expect(close()?.getAttribute("aria-label")).toBe("Einstellungen schließen");
  });

  it("takes GatedFrame's placeholder and button from translations, keeping {category}", () => {
    initCookieYes({
      mode: "cookie-only",
      i18n: {
        messages: {
          de: {
            gatedFrame: {
              placeholder: "Für diesen Inhalt müssen {category}-Cookies aktiviert sein.",
              action: "Einstellungen verwalten",
            },
          },
        },
      },
    });
    render(<GatedFrame src="https://example.com/embed" category="functional" title="Embed" />);

    // English default, with the category interpolated into the sentence.
    expect(document.body.textContent).toContain("This content requires");
    expect(document.body.textContent).toContain("functional");
    expect(document.body.textContent).toContain("Manage Preferences");

    act(() => {
      void getCookieYes().setLanguage("de");
    });

    // German, and the substitution still happens — the category is not swallowed.
    expect(document.body.textContent).toContain("Für diesen Inhalt");
    expect(document.body.textContent).toContain("functional");
    expect(document.body.textContent).toContain("Einstellungen verwalten");
    expect(document.body.textContent).not.toContain("Manage Preferences");
  });
});
