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
  renderToString as renderUiToString,
  type UiNode,
} from "@cookieyes/ui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSSRApp, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import { RecallButton } from "../controls/RecallButton.js";
import { CookieYes } from "../plugin.js";
import { CookieBanner } from "../presets/CookieBanner.js";
import { CookieOptOut } from "../presets/CookieOptOut.js";
import { CookiePreferences } from "../presets/CookiePreferences.js";
import { ReloadNotice } from "../presets/ReloadNotice.js";
import { type CookieYesRuntime, getCookieYes } from "../runtime.js";
import { IdNames, serialize } from "./contract-utils.js";
import { clearCookie, cookieOnly, mountWith, unmountAll } from "./test-utils.js";

/**
 * React draws its components from JSX and Vue from render functions; every other framework draws
 * the markup data in `@cookieyes/ui`. This compares them, element for element and attribute for
 * attribute (icon paths included), for every state the rendering contract records. A change to
 * either side fails here until the other side makes the same change.
 */

function query(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`not rendered: ${selector}`);
  return el;
}

async function settle(): Promise<void> {
  for (let i = 0; i < 4; i++) await nextTick();
}

/** Both trees as data, with generated ids named in the same order on each side. */
function same(vueEl: Element, markup: UiNode): void {
  const fromUi = renderToDom(markup);
  expect(serialize(fromUi, new IdNames(), true)).toEqual(serialize(vueEl, new IdNames(), true));
}

/** The runtime's state for the preferences dialog, as `ui`'s category model. */
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

/** A banner moved into the portal root carries a mark that only the adapters use. */
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
  unmountAll();
  _clearStopHandlers();
});

describe("markup parity with @cookieyes/ui", () => {
  for (const regulation of ["GDPR", "CCPA"] as const) {
    it(`draws the ${regulation} banner and its announcer the same way`, async () => {
      vi.useFakeTimers();
      mountWith(cookieOnly(regulation), CookieBanner);
      const rt = getCookieYes();
      await settle();
      vi.advanceTimersByTime(700);
      await settle();
      const card = query('[data-cy-part="banner"]');
      const titleId = card.getAttribute("aria-labelledby") ?? "";
      same(
        withoutReparentMark(query(".cy-banner-wrap")),
        banner({ translations: rt.translations, regulation, titleId }),
      );
      same(query('span[aria-live="assertive"]'), bannerAnnouncer(rt.translations.bannerTitle));
    });

    it(`server-renders the ${regulation} banner the same way`, async () => {
      const app = createSSRApp(CookieBanner);
      app.use(CookieYes, cookieOnly(regulation));
      const rt = getCookieYes();
      const fromVue = document.createElement("div");
      fromVue.innerHTML = await renderToString(app);
      const titleId = fromVue.querySelector("h2")?.id ?? "";
      const fromUi = document.createElement("div");
      fromUi.innerHTML = renderUiToString([
        bannerAnnouncer(),
        banner({ translations: rt.translations, regulation, titleId }),
      ]);
      expect(serialize(fromUi, new IdNames(), true)).toEqual(
        serialize(fromVue, new IdNames(), true),
      );
    });
  }

  it("draws the preferences dialog the same way, before and after a switch", async () => {
    mountWith(cookieOnly("GDPR"), CookiePreferences);
    const rt = getCookieYes();
    rt.manager.showPreferences();
    await settle();
    const overlay = query('[data-cy-part="overlay"]');
    const titleId = overlay.getAttribute("aria-labelledby") ?? "";
    const draw = () =>
      preferences({ translations: rt.translations, titleId, categories: categoriesOf(rt) });
    same(overlay, draw());

    query('[data-cy-part="toggle"] input').click();
    await settle();
    same(query('[data-cy-part="overlay"]'), draw());
    const switches = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[role="switch"]'),
    );
    const drawn = Array.from(
      renderToDom(draw()).querySelectorAll<HTMLInputElement>('input[role="switch"]'),
    );
    expect(drawn.map((s) => s.checked)).toEqual(switches.map((s) => s.checked));
  });

  it("draws the opt-out dialog the same way, open and confirmed", async () => {
    vi.useFakeTimers();
    mountWith(cookieOnly("CCPA"), CookieOptOut);
    const rt = getCookieYes();
    rt.showOptOut();
    await settle();
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

    checkbox().click();
    await settle();
    query('[data-cy-part="confirm"]').click();
    await settle();
    same(dialog(), draw({ secondsLeft: 10 }));
    vi.advanceTimersByTime(3000);
    await settle();
    same(dialog(), draw({ secondsLeft: 7 }));
  });

  it("draws the reload notice the same way", async () => {
    mountWith(
      { mode: "cookie-only", regulation: "GDPR", builtInIntegrations: [{ vendor: "hotjar" }] },
      ReloadNotice,
    );
    const rt = getCookieYes();
    rt.manager.acceptAll();
    rt.manager.rejectAll();
    await settle();
    same(query('[data-cy-part="reload-notice"]'), reloadNotice(rt.translations));
  });

  it("draws the recall button the same way", async () => {
    mountWith(cookieOnly("GDPR"), RecallButton);
    const rt = getCookieYes();
    rt.manager.acceptAll();
    await settle();
    same(query('[data-cy-part="recall"]'), recallButton(rt.translations));
  });
});
