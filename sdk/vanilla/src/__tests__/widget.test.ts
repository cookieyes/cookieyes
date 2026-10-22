import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { destroy, openOptOut, openPreferences, renderShell, start } from "../index.js";

const GDPR = { mode: "cookie-only", regulation: "GDPR" } as const;

function clearPage(): void {
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
  document.body.innerHTML = "";
}

/** The dialogs load on first open, so wait for the one asked for to appear. */
async function opened(selector: string): Promise<HTMLElement> {
  return vi.waitFor(() => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`${selector} not open yet`);
    return el;
  });
}

beforeEach(clearPage);
afterEach(() => {
  destroy();
  clearPage();
  vi.restoreAllMocks();
});

describe("start", () => {
  it("puts the banner first in the body and returns the consent runtime", () => {
    document.body.innerHTML = "<main><button>page</button></main>";
    const runtime = start(GDPR);
    expect(document.body.firstElementChild?.id).toBe("cookieyes-portal-root");
    expect(document.querySelector("[data-cky-banner]")).not.toBeNull();
    expect(runtime.consentStore.getState().activeUI).toBe("banner");
  });

  it("replaces a running banner when called again, with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    start(GDPR);
    start(GDPR);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("more than once"));
    expect(document.querySelectorAll("[data-cky-banner]")).toHaveLength(1);
    expect(document.querySelectorAll('[aria-live="assertive"]')).toHaveLength(1);
  });

  it("accepts the same configuration as initCookieYes: categories, regions, text", async () => {
    start({
      mode: "cookie-only",
      region: { detect: () => "US-CA", map: { "US-CA": "CCPA" } },
      categories: [
        { id: "essential", required: true, label: "Essential" },
        { id: "marketing", label: "Marketing" },
      ],
      i18n: { messages: { en: { doNotSell: "Opt me out" } } },
    });
    expect(document.querySelector('[data-cy-part="do-not-sell"]')?.textContent).toBe("Opt me out");
    destroy();
    start({
      mode: "cookie-only",
      regulation: "GDPR",
      categories: [
        { id: "essential", required: true, label: "Essential" },
        { id: "marketing", label: "Marketing" },
      ],
    });
    openPreferences();
    await opened('[data-cy-part="overlay"]');
    const labels = Array.from(document.querySelectorAll('[data-cy-part="category-label"]'));
    expect(labels.map((l) => l.textContent)).toEqual(["Essential", "Marketing"]);
  });

  it("inserts translations as text, never as markup", () => {
    start({
      ...GDPR,
      i18n: { messages: { en: { bannerTitle: '<img src=x onerror="alert(1)">' } } },
    });
    expect(document.querySelector("[data-cky-banner] img")).toBeNull();
    expect(document.querySelector('[data-cy-part="title"]')?.textContent).toBe(
      '<img src=x onerror="alert(1)">',
    );
  });

  it("records the decision and swaps the banner for the recall button", () => {
    const runtime = start(GDPR);
    (document.querySelector('[data-cy-part="reject-all"]') as HTMLElement).click();
    expect(runtime.consentManager.hasActed).toBe(true);
    expect(document.querySelector("[data-cky-banner]")).toBeNull();
    expect(document.querySelector('[data-cy-part="recall"]')).not.toBeNull();
  });
});

describe("openPreferences and openOptOut", () => {
  it("do nothing before start", () => {
    expect(() => openPreferences()).not.toThrow();
    expect(() => openOptOut()).not.toThrow();
    expect(document.body.children).toHaveLength(0);
  });

  it("open the dialogs from a link of the site's own and return focus to it", async () => {
    start(GDPR);
    const link = document.createElement("a");
    link.href = "#";
    document.body.appendChild(link);
    link.focus();
    openPreferences();
    await opened('[data-cy-part="overlay"]');
    const overlay = document.querySelector<HTMLElement>('[data-cy-part="overlay"]');
    expect(document.activeElement).toBe(overlay);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.querySelector('[data-cy-part="overlay"]')).toBeNull();
    expect(document.activeElement).toBe(link);

    openOptOut();
    await opened('[data-cy-part="optout"]');
    expect(document.querySelector('[data-cy-part="optout"]')).not.toBeNull();
    openOptOut();
    expect(document.querySelectorAll('[data-cy-part="optout"]')).toHaveLength(1);
  });

  it("keeps focus on a switch while its state changes", async () => {
    start(GDPR);
    openPreferences();
    await opened('[data-cy-part="overlay"]');
    const input = document.querySelector<HTMLInputElement>('[data-cy-part="toggle"] input');
    input?.focus();
    input?.click();
    expect(document.activeElement).toBe(input);
    expect(input?.closest("label")?.getAttribute("data-cy-state")).toBe("on");
    expect(input?.getAttribute("aria-checked")).toBe("true");
  });

  it("closes at once, with no confirmation, when saved without opting out", async () => {
    const runtime = start({ mode: "cookie-only", regulation: "CCPA" });
    openOptOut();
    await opened('[data-cy-part="optout"]');
    const box = document.querySelector<HTMLInputElement>('[data-cy-part="checkbox"]');
    if (box?.checked) box.click();
    (document.querySelector('[data-cy-part="confirm"]') as HTMLElement).click();
    expect(document.querySelector('[data-cy-part="optout"]')).toBeNull();
    expect(runtime.consentManager.hasActed).toBe(true);
  });

  it("closes the confirmed opt-out by itself after the countdown", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      start({ mode: "cookie-only", regulation: "CCPA" });
      openOptOut();
      await opened('[data-cy-part="optout"]');
      const box = document.querySelector<HTMLInputElement>('[data-cy-part="checkbox"]');
      if (!box?.checked) box?.click();
      (document.querySelector('[data-cy-part="confirm"]') as HTMLElement).click();
      expect(document.querySelector('[data-cy-part="confirmation"]')).not.toBeNull();
      vi.advanceTimersByTime(10_000);
      expect(document.querySelector('[data-cy-part="optout"]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("destroy", () => {
  it("leaves no element and no listener behind, and start works again", async () => {
    const added: string[] = [];
    const removed: string[] = [];
    for (const target of [document, window] as EventTarget[]) {
      const add = target.addEventListener.bind(target);
      const rem = target.removeEventListener.bind(target);
      vi.spyOn(target, "addEventListener").mockImplementation((type, fn, opts) => {
        added.push(type);
        add(type, fn, opts);
      });
      vi.spyOn(target, "removeEventListener").mockImplementation((type, fn, opts) => {
        removed.push(type);
        rem(type, fn, opts);
      });
    }
    document.body.innerHTML = "<main></main>";
    start({ ...GDPR, theme: { primaryColor: "#7c3aed" } });
    openPreferences();
    await opened('[data-cy-part="overlay"]');
    destroy();
    expect(document.body.innerHTML).toBe("<main></main>");
    expect([...removed].sort()).toEqual([...added].sort());

    start(GDPR);
    expect(document.querySelectorAll("[data-cky-banner]")).toHaveLength(1);
  });
});

describe("renderShell", () => {
  it("draws the banner as HTML for the first paint, in the configured language", () => {
    const html = renderShell({
      mode: "cookie-only",
      regulation: "CCPA",
      i18n: {
        locale: "de",
        messages: { de: { bannerTitle: "Wir respektieren Ihre Privatsphäre" } },
      },
    });
    expect(html).toContain("Wir respektieren Ihre Privatsphäre");
    expect(html).toContain('data-cy-part="do-not-sell"');
    expect(html).toContain("data-cy-shell");
    expect(html).not.toContain("style=");
  });

  it("is taken over by start without a second banner or a second entry animation", () => {
    document.body.innerHTML = `${renderShell(GDPR)}<main></main>`;
    start(GDPR);
    expect(document.querySelectorAll("[data-cky-banner]")).toHaveLength(1);
    expect(document.querySelectorAll('[aria-live="assertive"]')).toHaveLength(1);
    expect(document.querySelector("[data-cy-shell]")).toBeNull();
    expect(document.querySelector(".cy-banner-wrap")?.hasAttribute("data-cy-entered")).toBe(true);
  });

  it("is removed for a visitor who has already decided", () => {
    start(GDPR);
    (document.querySelector('[data-cy-part="accept-all"]') as HTMLElement).click();
    destroy();
    document.body.innerHTML = `${renderShell(GDPR)}<main></main>`;
    start(GDPR);
    expect(document.querySelector("[data-cky-banner]")).toBeNull();
    expect(document.querySelector("[data-cy-shell]")).toBeNull();
  });
});
