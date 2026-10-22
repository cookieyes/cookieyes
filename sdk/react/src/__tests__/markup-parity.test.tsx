import { _clearStopHandlers } from "@cookieyes/core";
import {
  banner,
  bannerAnnouncer,
  type CategoryModel,
  optOut,
  preferences,
  recallButton,
  reloadNotice,
  renderToDom,
  renderToString,
  type UiNode,
} from "@cookieyes/ui";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecallButton } from "../controls/RecallButton.js";
import { CookieBanner } from "../presets/CookieBanner.js";
import { CookieOptOut } from "../presets/CookieOptOut.js";
import { CookiePreferences } from "../presets/CookiePreferences.js";
import { ReloadNotice } from "../presets/ReloadNotice.js";
import { type CookieYesRuntime, createCookieYes } from "../runtime.js";
import { IdNames, serialize } from "./contract-utils.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

/**
 * React draws its components from JSX; every other framework draws the markup
 * data in `@cookieyes/ui`. This compares the two, element for element and
 * attribute for attribute (icon paths included), for every state the rendering
 * contract records. A change to either side fails here until the other side
 * makes the same change.
 */

function query(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`not rendered: ${selector}`);
  return el;
}

/** Both trees as data, with generated ids named in the same order on each side. */
function same(reactEl: Element, markup: UiNode): void {
  const fromUi = renderToDom(markup);
  expect(serialize(fromUi, new IdNames(), true)).toEqual(serialize(reactEl, new IdNames(), true));
}

/** React's own state for the preferences dialog, as `ui`'s category model. */
function categoriesOf(rt: CookieYesRuntime): CategoryModel[] {
  const snap = rt.getSnapshot();
  return rt.categories.ids.map((id) => {
    const required = rt.categories.requiredIds.has(id);
    const text = rt.translations.categories[id];
    return {
      id,
      label: text?.label ?? id,
      description: text?.description ?? "",
      checked: required || snap.categories[id] === true,
      required,
    };
  });
}

/** React marks a banner it has moved under `<body>`; that detail is React's alone. */
function withoutReparentMark(el: Element): Element {
  const copy = el.cloneNode(true) as Element;
  copy.removeAttribute("data-cy-entered");
  return copy;
}

beforeEach(() => {
  clearCookie();
  _clearStopHandlers();
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  teardown();
  _clearStopHandlers();
  document.getElementById("cookieyes-portal-root")?.remove();
});

describe("markup parity with @cookieyes/ui", () => {
  for (const regulation of ["GDPR", "CCPA"] as const) {
    it(`draws the ${regulation} banner and its announcer the same way`, () => {
      vi.useFakeTimers();
      const rt = mountOffline(regulation);
      render(<CookieBanner />);
      act(() => vi.advanceTimersByTime(700));
      const card = query('[data-cy-part="banner"]');
      const titleId = card.getAttribute("aria-labelledby") ?? "";
      same(
        withoutReparentMark(query(".cy-banner-wrap")),
        banner({ translations: rt.translations, regulation, titleId }),
      );
      same(query('span[aria-live="assertive"]'), bannerAnnouncer(rt.translations.bannerTitle));
    });

    it(`server-renders the ${regulation} banner the same way`, () => {
      const rt = mountOffline(regulation);
      const fromReact = document.createElement("div");
      fromReact.innerHTML = renderToStaticMarkup(<CookieBanner />);
      const titleId = fromReact.querySelector("h2")?.id ?? "";
      const fromUi = document.createElement("div");
      fromUi.innerHTML = renderToString([
        bannerAnnouncer(),
        banner({ translations: rt.translations, regulation, titleId }),
      ]);
      expect(serialize(fromUi, new IdNames(), true)).toEqual(
        serialize(fromReact, new IdNames(), true),
      );
    });
  }

  it("draws the preferences dialog the same way, before and after a switch", () => {
    const rt = mountOffline("GDPR");
    act(() => rt.manager.showPreferences());
    render(<CookiePreferences />);
    const overlay = query('[data-cy-part="overlay"]');
    const titleId = overlay.getAttribute("aria-labelledby") ?? "";
    const draw = () =>
      preferences({ translations: rt.translations, titleId, categories: categoriesOf(rt) });
    same(overlay, draw());

    act(() => {
      fireEvent.click(query('[data-cy-part="toggle"] input'));
    });
    same(query('[data-cy-part="overlay"]'), draw());
    const switches = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[role="switch"]'),
    );
    const drawn = Array.from(
      renderToDom(draw()).querySelectorAll<HTMLInputElement>('input[role="switch"]'),
    );
    expect(drawn.map((s) => s.checked)).toEqual(switches.map((s) => s.checked));
  });

  it("draws the opt-out dialog the same way, open and confirmed", () => {
    vi.useFakeTimers();
    const rt = mountOffline("CCPA");
    act(() => rt.showOptOut());
    render(<CookieOptOut />);
    const dialog = () => query('[data-cy-part="optout"]');
    const titleId = dialog().getAttribute("aria-labelledby") ?? "";
    const checkbox = () => query(".cy-optout-checkbox") as HTMLInputElement;
    const draw = (confirmation?: { secondsLeft: number }) =>
      optOut({
        translations: rt.translations,
        titleId,
        checkboxId: checkbox().id,
        optedOut: checkbox().checked,
        confirmation,
      });
    same(dialog(), draw());

    act(() => {
      fireEvent.click(checkbox());
    });
    act(() => {
      fireEvent.click(query('[data-cy-part="confirm"]'));
    });
    same(dialog(), draw({ secondsLeft: 10 }));
    act(() => vi.advanceTimersByTime(3000));
    same(dialog(), draw({ secondsLeft: 7 }));
  });

  it("draws the reload notice the same way", () => {
    const rt = createCookieYes()
      .mode("cookie-only")
      .regulation("GDPR")
      .integrations([{ vendor: "hotjar" }])
      .mount();
    render(<ReloadNotice />);
    act(() => {
      rt.manager.acceptAll();
      rt.manager.rejectAll();
    });
    same(query('[data-cy-part="reload-notice"]'), reloadNotice(rt.translations));
  });

  it("draws the recall button the same way", () => {
    const rt = mountOffline("GDPR");
    act(() => rt.manager.acceptAll());
    render(<RecallButton />);
    same(query('[data-cy-part="recall"]'), recallButton(rt.translations));
  });
});
