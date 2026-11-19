import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defineComponent, Fragment, h } from "vue";
import { Banner } from "../primitives/Banner.js";
import { OptOut } from "../primitives/OptOut.js";
import { Preferences } from "../primitives/Preferences.js";
import { getCookieYes } from "../runtime.js";
import { clearCookie, click, cookieOnly, getByText, mountWith, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

type Exposed = { element: HTMLElement | null };

describe("Banner parts, composed by hand", () => {
  it("renders our defaults, and the caller's slot content replaces them", async () => {
    mountWith(
      cookieOnly("GDPR"),
      defineComponent({
        render: () =>
          h(Banner.Root, null, {
            default: () => [
              h(Banner.Title),
              h(Banner.Description),
              h(Banner.Title, { id: "custom" }, { default: () => "Hello" }),
              h(Banner.Actions, null, { default: () => h(Banner.AcceptAll) }),
              h(Banner.Branding, null, { default: () => "Made by us" }),
            ],
          }),
      }),
    );
    await flushPromises();

    expect(document.querySelector('[data-cy-part="banner"] h2')?.textContent).toBe(
      "We value your privacy",
    );
    expect(document.querySelector('[data-cy-part="description"]')?.textContent).toContain(
      "cookies",
    );
    expect(document.getElementById("custom")?.textContent).toBe("Hello");
    expect(getByText("Accept All")).toBeTruthy();
    const link = document.querySelector<HTMLAnchorElement>('[data-cy-part="branding"]');
    expect(link?.textContent).toBe("Made by us");
    expect(link?.getAttribute("href")).toBe("https://www.cookieyes.com");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("uses the CCPA description under CCPA", async () => {
    mountWith(
      cookieOnly("CCPA"),
      defineComponent({
        render: () => h(Banner.Root, null, { default: () => h(Banner.Description) }),
      }),
    );
    await flushPromises();
    expect(document.querySelector('[data-cy-part="description"]')?.textContent).toBe(
      getCookieYes().translations.ccpaDescription,
    );
  });

  it("exposes the rendered nodes as `element`", async () => {
    let root: Exposed | null = null;
    let branding: Exposed | null = null;
    mountWith(
      cookieOnly("GDPR"),
      defineComponent({
        render: () =>
          h(
            Banner.Root,
            { ref: (i: unknown) => (root = i as Exposed) },
            {
              default: () => h(Banner.Branding, { ref: (i: unknown) => (branding = i as Exposed) }),
            },
          ),
      }),
    );
    await flushPromises();

    expect((root as unknown as Exposed).element).toBe(
      document.querySelector('[data-cy-part="banner"]'),
    );
    expect((branding as unknown as Exposed).element?.tagName).toBe("A");
  });

  it("lets the caller take the banner part off the root", async () => {
    mountWith(
      cookieOnly("GDPR"),
      defineComponent({
        render: () => h(Banner.Root, { "data-cy-part": undefined, id: "wrap" }),
      }),
    );
    await flushPromises();
    expect(document.getElementById("wrap")?.hasAttribute("data-cy-part")).toBe(false);
  });

  it("closes without a decision from a hand-built close button", async () => {
    mountWith(
      cookieOnly("GDPR"),
      defineComponent({
        render: () => h(Banner.Root, null, { default: () => h(Banner.Close) }),
      }),
    );
    await flushPromises();
    await click(document.querySelector('[data-cy-part="close"]'));
    expect(getCookieYes().getSnapshot().isBannerDismissed).toBe(true);
    expect(getCookieYes().getSnapshot().hasActed).toBe(false);
  });
});

describe("Preferences parts, composed by hand", () => {
  it("hands each category to the scoped slots, with its state", async () => {
    const seen: string[] = [];
    mountWith(
      cookieOnly("GDPR"),
      defineComponent({
        render: () =>
          h(Preferences.Root, null, {
            default: () => [
              h(Preferences.Title),
              h(Preferences.Intro),
              h(Preferences.Description, null, { default: () => "More detail" }),
              h(Preferences.Categories, null, {
                default: ({ category }: { category: string }) =>
                  h(
                    Preferences.Category,
                    { category },
                    {
                      default: (slot: {
                        label: string;
                        checked: boolean;
                        disabled: boolean;
                        toggle: (next: boolean) => void;
                      }) => {
                        seen.push(`${category}:${slot.checked}:${slot.disabled}`);
                        return h(
                          "button",
                          { id: `toggle-${category}`, onClick: () => slot.toggle(!slot.checked) },
                          slot.label,
                        );
                      },
                    },
                  ),
              }),
            ],
          }),
      }),
    );
    getCookieYes().manager.showPreferences();
    await flushPromises();

    expect(seen).toContain("necessary:true:true");
    expect(seen).toContain("analytics:false:false");
    expect(getByText("More detail")).toBeTruthy();
    expect(document.querySelectorAll('[role="listitem"]')).toHaveLength(5);

    await click(document.getElementById("toggle-analytics"));
    expect(getCookieYes().getSnapshot().categories.analytics).toBe(true);

    // A required category cannot be toggled.
    await click(document.getElementById("toggle-necessary"));
    expect(getCookieYes().getSnapshot().categories.necessary).toBe(true);
  });
});

describe("OptOut parts, composed by hand", () => {
  it("renders the pieces and reaches the confirmation", async () => {
    mountWith(
      cookieOnly("CCPA"),
      defineComponent({
        render: () =>
          h(OptOut.Root, null, {
            default: () =>
              h(Fragment, null, [
                h(OptOut.Title),
                h(OptOut.Description),
                h(OptOut.Checkbox, { id: "box" }),
                h(OptOut.CheckboxLabel, { for: "box" }),
                h(OptOut.Buttons, null, { default: () => h(OptOut.Save) }),
                h(OptOut.Success),
              ]),
          }),
      }),
    );
    getCookieYes().showOptOut();
    await flushPromises();

    expect(document.querySelector("label")?.textContent).toBe(
      "Do Not Sell or Share My Personal Information",
    );
    expect(document.querySelector("[role=status]")).toBeNull();
    await click(document.getElementById("box"));
    await click(getByText("Save My Preferences"));
    expect(document.querySelector("[role=status]")).not.toBeNull();
    expect(document.querySelector('[data-cy-part="confirm"]')).toBeNull();
  });
});
