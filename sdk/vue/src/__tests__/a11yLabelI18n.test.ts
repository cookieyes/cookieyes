import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { GatedFrame } from "../controls/GatedFrame.js";
import { RecallButton } from "../controls/RecallButton.js";
import { CookiePreferences } from "../presets/CookiePreferences.js";
import { getCookieYes } from "../runtime.js";
import { clearCookie, mountWith, unmountAll } from "./test-utils.js";

/**
 * These strings were hardcoded English once, so a fully translated site still announced itself
 * in English to screen reader users: the visible "Always Active" label, the accessible names of
 * the preferences dialog and the recall button, both halves of GatedFrame's blocked-content
 * placeholder, and the accessible name of the close button, which renders only an aria-hidden
 * icon so its label IS its entire accessible name.
 *
 * Every shipped language is typed `TranslationMap`, so a missing key fails the build. What the
 * types cannot guarantee is that the components actually read the keys, which is the regression
 * these tests exist to catch.
 */

beforeEach(clearCookie);
afterEach(unmountAll);

async function switchTo(tag: string): Promise<void> {
  await getCookieYes().setLanguage(tag);
  await flushPromises();
}

describe("accessible labels are translatable", () => {
  it('renders "Always Active" from translations, not a hardcoded string', async () => {
    mountWith(
      { mode: "cookie-only", i18n: { messages: { de: { alwaysActive: "Immer aktiv" } } } },
      CookiePreferences,
    );
    getCookieYes().manager.showPreferences();
    await flushPromises();

    expect(document.body.textContent).toContain("Always Active");

    await switchTo("de");

    expect(document.body.textContent).toContain("Immer aktiv");
    expect(document.body.textContent).not.toContain("Always Active");
  });

  // The dialog is named by its own visible heading, so the accessible name follows it.
  it("takes the preferences dialog's accessible name from its visible heading", async () => {
    mountWith(
      {
        mode: "cookie-only",
        i18n: {
          messages: { de: { preferencesTitle: "Einstellungen für die Zustimmung anpassen" } },
        },
      },
      CookiePreferences,
    );
    getCookieYes().manager.showPreferences();
    await flushPromises();

    const nameOfDialog = () => {
      const dialog = document.querySelector('[role="dialog"]');
      const id = dialog?.getAttribute("aria-labelledby");
      expect(id, "dialog should be labelled by its heading").toBeTruthy();
      const heading = id ? document.getElementById(id) : null;
      expect(heading?.tagName, "the label should be the visible heading").toBe("H2");
      return heading?.textContent;
    };

    expect(nameOfDialog()).toBe("Customise Consent Preferences");

    await switchTo("de");

    expect(nameOfDialog()).toBe("Einstellungen für die Zustimmung anpassen");
  });

  it("takes the recall button's accessible name and tooltip from translations", async () => {
    mountWith(
      {
        mode: "cookie-only",
        i18n: { messages: { de: { recallButtonLabel: "Zustimmungseinstellungen" } } },
      },
      RecallButton,
    );
    // The recall button stays hidden until the visitor has acted under GDPR.
    getCookieYes().manager.acceptAll();
    await flushPromises();

    const before = document.querySelector(".cy-widget");
    expect(before?.getAttribute("aria-label")).toBe("Consent Preferences");
    // Both attributes read the same key: the tooltip was hardcoded separately.
    expect(before?.getAttribute("data-tooltip")).toBe("Consent Preferences");

    await switchTo("de");

    const after = document.querySelector(".cy-widget");
    expect(after?.getAttribute("aria-label")).toBe("Zustimmungseinstellungen");
    expect(after?.getAttribute("data-tooltip")).toBe("Zustimmungseinstellungen");
  });

  it("takes the preferences dialog's close-button label from translations", async () => {
    mountWith(
      {
        mode: "cookie-only",
        i18n: { messages: { de: { preferencesCloseLabel: "Einstellungen schließen" } } },
      },
      CookiePreferences,
    );
    getCookieYes().manager.showPreferences();
    await flushPromises();

    const close = () => document.querySelector('[data-cy-part="close"]');
    expect(close()?.getAttribute("aria-label")).toBe("Close preferences");

    await switchTo("de");

    expect(close()?.getAttribute("aria-label")).toBe("Einstellungen schließen");
  });

  it("takes GatedFrame's placeholder and button from translations, keeping {category}", async () => {
    mountWith(
      {
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
      },
      defineComponent({
        render: () =>
          h(GatedFrame, {
            src: "https://example.com/embed",
            category: "functional",
            title: "Embed",
          }),
      }),
    );
    await flushPromises();

    // English default, with the category's label interpolated into the sentence.
    expect(document.body.textContent).toContain("This content requires");
    expect(document.body.textContent).toContain("Functional");
    expect(document.body.textContent).toContain("Manage Preferences");

    await switchTo("de");

    // German, and the substitution still happens: the category is not swallowed.
    expect(document.body.textContent).toContain("Für diesen Inhalt");
    expect(document.body.textContent).toContain("Functional");
    expect(document.body.textContent).toContain("Einstellungen verwalten");
    expect(document.body.textContent).not.toContain("Manage Preferences");
  });

  // The visible half of the "Powered by" link was typed in English in the component, even though
  // its accessible name was already translated.
  it('shows the "Powered by" words from translations, around the logo', async () => {
    mountWith(
      {
        mode: "cookie-only",
        i18n: { messages: { de: { poweredBy: "Bereitgestellt von CookieYes" } } },
      },
      CookiePreferences,
    );
    getCookieYes().manager.showPreferences();
    await flushPromises();
    await switchTo("de");
    const link = document.querySelector('[data-cy-part="branding"]');
    expect(link?.textContent).toBe("Bereitgestellt von");
    expect(link?.querySelector("svg")).not.toBeNull();
  });
});
