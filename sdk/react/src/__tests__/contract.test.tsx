import { _clearStopHandlers, type ThemeConfig } from "@cookieyes/core";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, it, vi } from "vitest";
import { RecallButton } from "../controls/RecallButton.js";
import { CookieBanner } from "../presets/CookieBanner.js";
import { CookieOptOut } from "../presets/CookieOptOut.js";
import { CookiePreferences } from "../presets/CookiePreferences.js";
import { ReloadNotice } from "../presets/ReloadNotice.js";
import { type CookieYesRuntime, createCookieYes, initCookieYes } from "../runtime.js";
import { computeThemeVars } from "../styles/tokens.js";
import {
  expectContract,
  IdNames,
  ident,
  serialize,
  serializeBody,
  tabOrder,
  trapEdges,
} from "./contract-utils.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

/**
 * The rendering contract: what the React components put on the page today,
 * recorded as data in `__contract__/`. The shared UI layer and every other
 * framework's banner are checked against these files, so a difference here is
 * a change for every framework at once and is reviewed as one. See
 * `__contract__/README.md` for how to update a recording on purpose.
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
function activate(el: HTMLElement): void {
  act(() => {
    el.focus();
    fireEvent.click(el);
  });
}

function pressEscape(): void {
  act(() => {
    fireEvent.keyDown(document, { key: "Escape" });
  });
}

/** Unmounts everything and drops the runtime, between cases inside one test. */
function resetBetweenCases(): void {
  cleanup();
  teardown();
  document.getElementById("cookieyes-portal-root")?.remove();
}

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
    it(`records the ${regulation} banner, its announcement and its keyboard behaviour`, () => {
      vi.useFakeTimers();
      mountOffline(regulation);
      const { container } = render(
        <>
          <CookieBanner />
          <RecallButton />
        </>,
      );
      const announcer = query('span[aria-live="assertive"]');
      const announcedBefore = announcer.textContent;
      act(() => vi.advanceTimersByTime(699));
      const announcedAt699ms = announcer.textContent;
      act(() => vi.advanceTimersByTime(1));
      const announcedAt700ms = announcer.textContent;

      const card = query('[data-cy-part="banner"]');
      const focusOnShow = ident(document.activeElement);
      const order = tabOrder(card);
      const edges = trapEdges(card);
      pressEscape();
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

  it("records where focus goes when the banner closes", () => {
    const outcome: Record<string, string> = {};
    for (const [action, part] of [
      ["acceptAll", "accept-all"],
      ["rejectAll", "reject-all"],
      ["close", "close"],
    ] as const) {
      mountOffline("GDPR");
      render(
        <>
          <CookieBanner />
          <RecallButton />
        </>,
      );
      activate(query(`[data-cy-part="banner"] [data-cy-part="${part}"]`));
      outcome[action] = ident(document.activeElement);
      resetBetweenCases();
    }
    expectContract("banner.focus-on-close", outcome);
  });

  it("records the server-rendered banner (the first-paint shell)", () => {
    const html: Record<string, ReturnType<typeof serializeBody>> = {};
    for (const regulation of ["GDPR", "CCPA"] as const) {
      mountOffline(regulation);
      const markup = renderToStaticMarkup(<CookieBanner />);
      const holder = document.createElement("div");
      holder.innerHTML = markup;
      html[regulation.toLowerCase()] = Array.from(holder.childNodes)
        .map((n) => serialize(n, new IdNames()))
        .filter((n) => n !== null);
      teardown();
    }
    expectContract("banner.server", html);
  });
});

describe("rendering contract: preferences", () => {
  it("records the dialog, its toggles and its keyboard behaviour", () => {
    mountOffline("GDPR");
    const { container } = render(
      <>
        <CookieBanner />
        <CookiePreferences />
        <RecallButton />
      </>,
    );
    activate(query('[data-cy-part="banner"] [data-cy-part="customise"]'));
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
    const firstSwitch = query('[data-cy-part="toggle"] input');
    act(() => {
      fireEvent.click(firstSwitch);
    });
    const togglesAfterSwitchingFirst = toggles();

    pressEscape();
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

  it("records where focus goes after each footer action", () => {
    const outcome: Record<string, string> = {};
    for (const part of ["accept-all", "reject-all", "save", "close"]) {
      mountOffline("GDPR");
      render(
        <>
          <CookieBanner />
          <CookiePreferences />
          <RecallButton />
        </>,
      );
      activate(query('[data-cy-part="banner"] [data-cy-part="customise"]'));
      activate(query(`[data-cy-part="overlay"] [data-cy-part="${part}"]`));
      outcome[part] = ident(document.activeElement);
      resetBetweenCases();
    }
    expectContract("preferences.focus-on-close", outcome);
  });
});

describe("rendering contract: opt-out", () => {
  function openFromBanner(): ReturnType<typeof render> {
    mountOffline("CCPA");
    const result = render(
      <>
        <CookieBanner />
        <CookieOptOut />
        <RecallButton />
      </>,
    );
    activate(query('[data-cy-part="banner"] [data-cy-part="do-not-sell"]'));
    return result;
  }

  it("records the dialog and its keyboard behaviour", () => {
    const { container } = openFromBanner();
    const dialog = query('[data-cy-part="optout"]');
    const focusOnOpen = ident(document.activeElement);
    const dom = serializeBody(container);
    const order = tabOrder(dialog);
    const edges = trapEdges(dialog);
    pressEscape();
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

  it("records the confirmation and its countdown after opting out", () => {
    vi.useFakeTimers();
    const { container } = openFromBanner();
    const checkbox = query('[data-cy-part="optout"] input[type="checkbox"]');
    const checkedOnOpen = (checkbox as HTMLInputElement).checked;
    if (!checkedOnOpen) {
      act(() => {
        fireEvent.click(checkbox);
      });
    }
    activate(query('[data-cy-part="optout"] [data-cy-part="confirm"]'));
    const dom = serializeBody(container);
    const focusOnConfirm = ident(document.activeElement);
    const countdown = () => document.querySelector(".cy-optout-countdown")?.textContent ?? null;
    const countdownAt0s = countdown();
    act(() => vi.advanceTimersByTime(3000));
    const countdownAt3s = countdown();
    act(() => vi.advanceTimersByTime(6999));
    const openAt9999ms = document.querySelector('[data-cy-part="optout"]') !== null;
    act(() => vi.advanceTimersByTime(1));
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

  it("records that saving without opting out closes at once", () => {
    openFromBanner();
    const checkbox = query('[data-cy-part="optout"] input[type="checkbox"]') as HTMLInputElement;
    if (checkbox.checked) {
      act(() => {
        fireEvent.click(checkbox);
      });
    }
    activate(query('[data-cy-part="optout"] [data-cy-part="confirm"]'));
    expectContract("optout.saved-without-opt-out", {
      open: document.querySelector('[data-cy-part="optout"]') !== null,
      confirmationShown: document.querySelector('[role="status"]') !== null,
      focusAfterClose: ident(document.activeElement),
    });
  });
});

describe("rendering contract: reload notice", () => {
  it("records the notice shown after revoking a tool that needs a reload", () => {
    const rt = createCookieYes()
      .mode("cookie-only")
      .regulation("GDPR")
      .integrations([{ vendor: "hotjar" }])
      .mount();
    const { container } = render(<ReloadNotice />);
    const renderedBeforeRevoke = container.childNodes.length > 0;
    act(() => {
      rt.manager.acceptAll();
      rt.manager.rejectAll();
    });
    const notice = query('[data-cy-part="reload-notice"]');
    const dom = serializeBody(container);
    const focusOnShow = ident(document.activeElement);
    const order = tabOrder(notice);
    activate(query('[data-cy-part="reload-dismiss"]'));
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

  it("records when the button is shown", () => {
    const shown: Record<string, boolean> = {};
    for (const c of cases) {
      const rt = mountOffline(c.regulation);
      act(() => c.setup(rt));
      render(<RecallButton />);
      shown[c.name] = document.querySelector('[data-cy-part="recall"]') !== null;
      resetBetweenCases();
    }
    expectContract("recall.visibility", shown);
  });

  for (const regulation of ["GDPR", "CCPA"] as const) {
    it(`records the ${regulation} button and what it opens`, () => {
      const rt = mountOffline(regulation);
      act(() => rt.manager.acceptAll());
      const { container } = render(
        <>
          <RecallButton />
          <CookiePreferences />
          <CookieOptOut />
        </>,
      );
      const dom = serializeBody(container);
      activate(query('[data-cy-part="recall"]'));
      const opened = document.querySelector('[data-cy-part="overlay"]')
        ? "preferences"
        : document.querySelector('[data-cy-part="optout"]')
          ? "optout"
          : "nothing";
      const focusOnOpen = ident(document.activeElement);
      pressEscape();
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
  it("records the default and dark values of every theme variable", () => {
    // Which variables each setting drives, found by changing one setting at a
    // time, so the mapping is measured rather than written down by hand.
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

  it("records what each component writes for each colour scheme and for a custom theme", async () => {
    const opened: Array<{
      name: string;
      regulation: "GDPR" | "CCPA";
      open: (rt: CookieYesRuntime) => void;
      ui: ReactElement;
      themed: string;
    }> = [
      {
        name: "banner",
        regulation: "GDPR",
        open: () => {},
        ui: <CookieBanner />,
        themed: ".cy-banner-wrap",
      },
      {
        name: "preferences",
        regulation: "GDPR",
        open: (rt) => rt.manager.showPreferences(),
        ui: <CookiePreferences />,
        themed: '[data-cy-part="overlay"]',
      },
      {
        name: "optout",
        regulation: "CCPA",
        open: (rt) => rt.showOptOut(),
        ui: <CookieOptOut />,
        themed: '[data-cy-part="optout"]',
      },
      {
        name: "recall",
        regulation: "GDPR",
        open: (rt) => rt.manager.acceptAll(),
        ui: <RecallButton />,
        themed: '[data-cy-part="recall"]',
      },
    ];

    const out: Record<string, Record<string, unknown>> = {};
    for (const c of opened) {
      const row: Record<string, unknown> = {};
      for (const colorScheme of ["system", "light", "dark"] as const) {
        const rt = initCookieYes({ mode: "offline", regulation: c.regulation, colorScheme });
        act(() => c.open(rt));
        render(c.ui);
        row[colorScheme] = query(c.themed).getAttribute("data-cy-scheme");
        resetBetweenCases();
      }
      const rt = initCookieYes({ mode: "offline", regulation: c.regulation, theme: FULL_THEME });
      act(() => c.open(rt));
      render(c.ui);
      const el = query(c.themed);
      await waitFor(() => {
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
