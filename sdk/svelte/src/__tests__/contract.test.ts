import { _clearStopHandlers, type CookieYesConfig, type ThemeConfig } from "@cookieyes/core";
import { computeThemeVars } from "@cookieyes/ui";
import type { Component } from "svelte";
import { afterEach, beforeEach, describe, it, vi } from "vitest";
import RecallButton from "../controls/RecallButton.svelte";
import CookieBanner from "../presets/CookieBanner.svelte";
import CookieOptOut from "../presets/CookieOptOut.svelte";
import CookiePreferences from "../presets/CookiePreferences.svelte";
import ReloadNotice from "../presets/ReloadNotice.svelte";
import { type CookieYesRuntime, getCookieYes } from "../runtime.js";
import {
  expectContract,
  IdNames,
  ident,
  serialize,
  serializeBody,
  tabOrder,
  trapEdges,
} from "./contract-utils.js";
import Compose from "./fixtures/Compose.svelte";
import { renderOnServer, useServerRenderer } from "./ssr-render.js";
import { clearCookie, cookieOnly, mountWith, settle, unmountAll } from "./test-utils.js";

/**
 * The Svelte adapter against the rendering contract React recorded in
 * `sdk/react/src/__tests__/__contract__/`. The recordings are read, never written: a difference
 * here is a difference from React, and is fixed in the adapter or reviewed in React as a change
 * for every framework at once.
 */

/** Every theme setting, each set to a value distinct from its default. */
const FULL_THEME: Required<ThemeConfig> = {
  primaryColor: "#7c3aed",
  backgroundColor: "#fefce8",
  textColor: "#0f172a",
  mutedTextColor: "#475569",
  borderColor: "#cbd5e1",
  borderRadius: "12px",
  fontFamily: "Georgia, serif",
  focusColor: "#f97316",
  widgetBackgroundColor: "#065f46",
};

function query(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`not rendered: ${selector}`);
  return el;
}

/** Focuses `el` and clicks it, as a keyboard or pointer user would. */
async function activate(el: HTMLElement): Promise<void> {
  el.focus();
  el.click();
  await settle();
}

async function pressEscape(): Promise<void> {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await settle();
}

async function advance(ms: number): Promise<void> {
  vi.advanceTimersByTime(ms);
  await settle();
}

/** Mounts `components` side by side and returns the element the app was mounted into. */
async function render(
  config: CookieYesConfig,
  ...components: Component<any>[]
): Promise<{ container: Element; rt: CookieYesRuntime }> {
  const view = mountWith(config, Compose, { parts: components });
  await settle();
  return { container: view.container, rt: getCookieYes() };
}

/** Unmounts everything and drops the runtime, between cases inside one test. */
function resetBetweenCases(): void {
  unmountAll();
}

useServerRenderer();
beforeEach(() => {
  clearCookie();
  _clearStopHandlers();
});
afterEach(() => {
  vi.useRealTimers();
  resetBetweenCases();
  _clearStopHandlers();
});

describe("rendering contract: banner", () => {
  for (const regulation of ["GDPR", "CCPA"] as const) {
    it(`matches the ${regulation} banner, its announcement and its keyboard behaviour`, async () => {
      vi.useFakeTimers();
      const { container } = await render(cookieOnly(regulation), CookieBanner, RecallButton);
      const announcer = query('span[aria-live="assertive"]');
      const announcedBefore = announcer.textContent;
      await advance(699);
      const announcedAt699ms = announcer.textContent;
      await advance(1);
      const announcedAt700ms = announcer.textContent;

      const card = query('[data-cy-part="banner"]');
      const focusOnShow = ident(document.activeElement);
      const order = tabOrder(card);
      const edges = trapEdges(card);
      await pressEscape();
      const visibleAfterEscape = document.querySelector('[data-cy-part="banner"]') !== null;

      expectContract(`banner.${regulation.toLowerCase()}`, {
        dom: serializeBody(container),
        announcement: {
          politeness: announcer.getAttribute("aria-live"),
          onShow: announcedBefore,
          at699ms: announcedAt699ms,
          at700ms: announcedAt700ms,
        },
        keyboard: { focusOnShow, tabOrder: order, trapEdges: edges, visibleAfterEscape },
      });
    });
  }

  it("matches where focus goes when the banner closes", async () => {
    const outcome: Record<string, string> = {};
    for (const [action, part] of [
      ["acceptAll", "accept-all"],
      ["rejectAll", "reject-all"],
      ["close", "close"],
    ] as const) {
      await render(cookieOnly("GDPR"), CookieBanner, RecallButton);
      await activate(query(`[data-cy-part="banner"] [data-cy-part="${part}"]`));
      outcome[action] = ident(document.activeElement);
      resetBetweenCases();
    }
    expectContract("banner.focus-on-close", outcome);
  });

  it("matches the server-rendered banner (the first-paint shell)", async () => {
    const html: Record<string, ReturnType<typeof serializeBody>> = {};
    for (const regulation of ["GDPR", "CCPA"] as const) {
      const { body: markup } = await renderOnServer({ parts: ["banner"], regulation });
      const holder = document.createElement("div");
      holder.innerHTML = markup;
      html[regulation.toLowerCase()] = Array.from(holder.childNodes)
        .map((n) => serialize(n, new IdNames()))
        .filter((n) => n !== null);
      resetBetweenCases();
    }
    expectContract("banner.server", html);
  });
});

describe("rendering contract: preferences", () => {
  it("matches the dialog, its toggles and its keyboard behaviour", async () => {
    const { container } = await render(
      cookieOnly("GDPR"),
      CookieBanner,
      CookiePreferences,
      RecallButton,
    );
    await activate(query('[data-cy-part="banner"] [data-cy-part="customise"]'));
    const dialog = query('[data-cy-part="overlay"]');
    const focusOnOpen = ident(document.activeElement);
    const dom = serializeBody(container);
    const order = tabOrder(dialog);
    const edges = trapEdges(dialog);

    const toggles = () =>
      Array.from(document.querySelectorAll('[data-cy-part="category"]')).map((cat) => ({
        label: cat.querySelector('[data-cy-part="category-label"]')?.textContent ?? "",
        state:
          cat.querySelector('[data-cy-part="toggle"]')?.getAttribute("data-cy-state") ??
          "always-active",
      }));
    const togglesOnOpen = toggles();
    await activate(query('[data-cy-part="toggle"] input'));
    const togglesAfterSwitchingFirst = toggles();

    await pressEscape();
    const openAfterEscape = document.querySelector('[data-cy-part="overlay"]') !== null;
    const focusAfterEscape = ident(document.activeElement);

    expectContract("preferences", {
      dom,
      toggles: { onOpen: togglesOnOpen, afterSwitchingFirst: togglesAfterSwitchingFirst },
      keyboard: {
        focusOnOpen,
        tabOrder: order,
        trapEdges: edges,
        openAfterEscape,
        focusAfterEscape,
      },
    });
  });

  it("matches where focus goes after each footer action", async () => {
    const outcome: Record<string, string> = {};
    for (const part of ["accept-all", "reject-all", "save", "close"]) {
      await render(cookieOnly("GDPR"), CookieBanner, CookiePreferences, RecallButton);
      await activate(query('[data-cy-part="banner"] [data-cy-part="customise"]'));
      await activate(query(`[data-cy-part="overlay"] [data-cy-part="${part}"]`));
      outcome[part] = ident(document.activeElement);
      resetBetweenCases();
    }
    expectContract("preferences.focus-on-close", outcome);
  });
});

describe("rendering contract: opt-out", () => {
  async function openFromBanner(): Promise<Element> {
    const { container } = await render(
      cookieOnly("CCPA"),
      CookieBanner,
      CookieOptOut,
      RecallButton,
    );
    await activate(query('[data-cy-part="banner"] [data-cy-part="do-not-sell"]'));
    return container;
  }

  it("matches the dialog and its keyboard behaviour", async () => {
    const container = await openFromBanner();
    const dialog = query('[data-cy-part="optout"]');
    const focusOnOpen = ident(document.activeElement);
    const dom = serializeBody(container);
    const order = tabOrder(dialog);
    const edges = trapEdges(dialog);
    await pressEscape();
    expectContract("optout", {
      dom,
      keyboard: {
        focusOnOpen,
        tabOrder: order,
        trapEdges: edges,
        openAfterEscape: document.querySelector('[data-cy-part="optout"]') !== null,
        focusAfterEscape: ident(document.activeElement),
      },
    });
  });

  it("matches the confirmation and its countdown after opting out", async () => {
    vi.useFakeTimers();
    const container = await openFromBanner();
    const checkbox = query('[data-cy-part="optout"] input[type="checkbox"]');
    const checkedOnOpen = (checkbox as HTMLInputElement).checked;
    if (!checkedOnOpen) await activate(checkbox);
    await activate(query('[data-cy-part="optout"] [data-cy-part="confirm"]'));
    const dom = serializeBody(container);
    const focusOnConfirm = ident(document.activeElement);
    const countdown = () => document.querySelector(".cy-optout-countdown")?.textContent ?? null;
    const countdownAt0s = countdown();
    await advance(3000);
    const countdownAt3s = countdown();
    await advance(6999);
    const openAt9999ms = document.querySelector('[data-cy-part="optout"]') !== null;
    await advance(1);
    const openAt10s = document.querySelector('[data-cy-part="optout"]') !== null;

    expectContract("optout.confirmed", {
      checkedOnOpen,
      dom,
      focusOnConfirm,
      countdown: { at0s: countdownAt0s, at3s: countdownAt3s },
      open: { at9999ms: openAt9999ms, at10s: openAt10s },
      focusAfterClose: ident(document.activeElement),
    });
  });

  it("matches that saving without opting out closes at once", async () => {
    await openFromBanner();
    const checkbox = query('[data-cy-part="optout"] input[type="checkbox"]') as HTMLInputElement;
    if (checkbox.checked) await activate(checkbox);
    await activate(query('[data-cy-part="optout"] [data-cy-part="confirm"]'));
    expectContract("optout.saved-without-opt-out", {
      open: document.querySelector('[data-cy-part="optout"]') !== null,
      confirmationShown: document.querySelector('[role="status"]') !== null,
      focusAfterClose: ident(document.activeElement),
    });
  });
});

describe("rendering contract: reload notice", () => {
  it("matches the notice shown after revoking a tool that needs a reload", async () => {
    const { container, rt } = await render(
      { mode: "cookie-only", regulation: "GDPR", builtInIntegrations: [{ vendor: "hotjar" }] },
      ReloadNotice,
    );
    const renderedBeforeRevoke = container.children.length > 0 || container.textContent !== "";
    rt.manager.acceptAll();
    rt.manager.rejectAll();
    await settle();
    const notice = query('[data-cy-part="reload-notice"]');
    const dom = serializeBody(container);
    const focusOnShow = ident(document.activeElement);
    const order = tabOrder(notice);
    await activate(query('[data-cy-part="reload-dismiss"]'));
    expectContract("reload-notice", {
      renderedBeforeRevoke,
      dom,
      keyboard: { focusOnShow, tabOrder: order },
      shownAfterDismiss: document.querySelector('[data-cy-part="reload-notice"]') !== null,
    });
  });
});

describe("rendering contract: recall button", () => {
  type Case = { name: string; regulation: "GDPR" | "CCPA"; setup: (rt: CookieYesRuntime) => void };
  const cases: Case[] = [
    { name: "gdpr, no decision yet", regulation: "GDPR", setup: () => {} },
    { name: "gdpr, after a decision", regulation: "GDPR", setup: (rt) => rt.manager.acceptAll() },
    {
      name: "gdpr, banner closed without a decision",
      regulation: "GDPR",
      setup: (rt) => rt.manager.dismissBanner(),
    },
    {
      name: "gdpr, preferences open",
      regulation: "GDPR",
      setup: (rt) => {
        rt.manager.acceptAll();
        rt.manager.showPreferences();
      },
    },
    { name: "ccpa, no decision yet", regulation: "CCPA", setup: () => {} },
    {
      name: "ccpa, banner closed without a decision",
      regulation: "CCPA",
      setup: (rt) => rt.manager.dismissBanner(),
    },
    {
      name: "ccpa, opt-out open",
      regulation: "CCPA",
      setup: (rt) => {
        rt.manager.dismissBanner();
        rt.showOptOut();
      },
    },
  ];

  it("matches when the button is shown", async () => {
    const shown: Record<string, boolean> = {};
    for (const c of cases) {
      const view = mountWith(cookieOnly(c.regulation), RecallButton);
      c.setup(getCookieYes());
      await settle();
      shown[c.name] = document.querySelector('[data-cy-part="recall"]') !== null;
      view.unmount();
      resetBetweenCases();
    }
    expectContract("recall.visibility", shown);
  });

  for (const regulation of ["GDPR", "CCPA"] as const) {
    it(`matches the ${regulation} button and what it opens`, async () => {
      const { container, rt } = await render(
        cookieOnly(regulation),
        RecallButton,
        CookiePreferences,
        CookieOptOut,
      );
      rt.manager.acceptAll();
      await settle();
      const dom = serializeBody(container);
      await activate(query('[data-cy-part="recall"]'));
      const opened = document.querySelector('[data-cy-part="overlay"]')
        ? "preferences"
        : document.querySelector('[data-cy-part="optout"]')
          ? "optout"
          : "nothing";
      const focusOnOpen = ident(document.activeElement);
      await pressEscape();
      expectContract(`recall.${regulation.toLowerCase()}`, {
        dom,
        opens: opened,
        focusOnOpen,
        focusAfterEscape: ident(document.activeElement),
      });
    });
  }
});

describe("rendering contract: theme", () => {
  it("matches the default and dark values of every theme variable", () => {
    // Which variables each setting drives, found by changing one setting at a time, so the
    // mapping is measured rather than written down by hand.
    const base = computeThemeVars(undefined, false);
    const drives: Record<string, string[]> = {};
    for (const key of Object.keys(FULL_THEME) as Array<keyof ThemeConfig>) {
      const changed = computeThemeVars({ [key]: FULL_THEME[key] }, false);
      drives[key] = Object.keys(changed).filter(
        (v) => changed[v as keyof typeof changed] !== base[v as keyof typeof base],
      );
    }
    const dark = computeThemeVars(undefined, true);
    expectContract("theme", {
      settings: Object.keys(FULL_THEME),
      drives,
      light: base,
      dark,
      changedInDark: Object.keys(dark).filter(
        (v) => dark[v as keyof typeof dark] !== base[v as keyof typeof base],
      ),
      fullThemeLight: computeThemeVars(FULL_THEME, false),
      fullThemeDark: computeThemeVars(FULL_THEME, true),
    });
  });

  it("matches what each component writes for each colour scheme and for a custom theme", async () => {
    const opened: Array<{
      name: string;
      regulation: "GDPR" | "CCPA";
      open: (rt: CookieYesRuntime) => void;
      ui: Component<any>;
      themed: string;
    }> = [
      {
        name: "banner",
        regulation: "GDPR",
        open: () => {},
        ui: CookieBanner,
        themed: ".cy-banner-wrap",
      },
      {
        name: "preferences",
        regulation: "GDPR",
        open: (rt) => rt.manager.showPreferences(),
        ui: CookiePreferences,
        themed: '[data-cy-part="overlay"]',
      },
      {
        name: "optout",
        regulation: "CCPA",
        open: (rt) => rt.showOptOut(),
        ui: CookieOptOut,
        themed: '[data-cy-part="optout"]',
      },
      {
        name: "recall",
        regulation: "GDPR",
        open: (rt) => rt.manager.acceptAll(),
        ui: RecallButton,
        themed: '[data-cy-part="recall"]',
      },
    ];

    const out: Record<string, Record<string, unknown>> = {};
    for (const c of opened) {
      const row: Record<string, unknown> = {};
      for (const colorScheme of ["system", "light", "dark"] as const) {
        mountWith({ mode: "cookie-only", regulation: c.regulation, colorScheme }, c.ui);
        c.open(getCookieYes());
        await settle();
        row[colorScheme] = query(c.themed).getAttribute("data-cy-scheme");
        resetBetweenCases();
      }
      mountWith({ mode: "cookie-only", regulation: c.regulation, theme: FULL_THEME }, c.ui);
      c.open(getCookieYes());
      await settle();
      const el = query(c.themed);
      await vi.waitFor(() => {
        if (!el.style.getPropertyValue("--cy-primary")) throw new Error("theme not applied yet");
      });
      const vars: Record<string, string> = {};
      for (let i = 0; i < el.style.length; i++) {
        const name = el.style.item(i);
        if (name.startsWith("--cy-")) vars[name] = el.style.getPropertyValue(name).trim();
      }
      row.customTheme = { scheme: el.getAttribute("data-cy-scheme"), vars };
      row.element = ident(el);
      out[c.name] = row;
      resetBetweenCases();
    }
    expectContract("theme.applied", out);
  });
});
