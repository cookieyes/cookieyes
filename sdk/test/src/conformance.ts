import {
  type CookieYesConfig,
  defaultTranslations,
  resolveCategories,
  type TranslationMap,
} from "@cookieyes/core";
import {
  ANNOUNCE_DELAY_MS,
  banner,
  bannerAnnouncer,
  FOCUSABLE,
  optOut,
  preferences,
  recallButton,
  reloadNotice,
  renderToDom,
  type UiNode,
} from "@cookieyes/ui";

/** A key a visitor presses. */
export type ConformanceKey = "Tab" | "Shift+Tab" | "Escape";

/**
 * Everything the conformance suite needs from a framework adapter, and nothing
 * else. The suite never learns how the banner got onto the page: it reads parts,
 * states, roles and focus, and acts through these methods the way a visitor
 * would.
 */
export type ConformanceDriver = {
  /** Shown in the test names, e.g. `"react"`. */
  name: string;
  /**
   * Starts the SDK with `config` and puts every component on the page: the
   * banner, the preferences dialog, the opt-out dialog, the reload notice and
   * the recall button, each showing only when its state says so.
   */
  mount(config: CookieYesConfig): void | Promise<void>;
  /** Removes everything `mount` added and resets the SDK, so the next test starts fresh. */
  unmount(): void | Promise<void>;
  /** Switches the language, as the runtime's `setLanguage` does. */
  setLanguage(tag: string): Promise<void>;
  /** Clicks an element the way a visitor does. */
  click(el: Element): Promise<void>;
  /** Presses a key the way a visitor does. In a real browser, use real key events. */
  press(key: ConformanceKey): Promise<void>;
  /**
   * The HTML the framework sends before any script runs, for a framework that
   * renders on a server or ships a first-paint snippet. Leave it out otherwise.
   */
  serverHtml?: ((config: CookieYesConfig) => string | Promise<string>) | undefined;
};

/** The test functions of the runner in use. Vitest's and Jest's both fit. */
export type ConformanceRunner = {
  describe: (name: string, fn: () => void) => void;
  it: (name: string, fn: () => Promise<void>, timeout?: number) => void;
};

// ── Small helpers, kept local so the suite has no assertion library ─────────

function fail(message: string): never {
  throw new Error(`[conformance] ${message}`);
}

function check(condition: boolean, message: string): void {
  if (!condition) fail(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retries until `fn` stops throwing, because some frameworks render after the event. */
async function until<T>(fn: () => T, what: string, timeout = 2000): Promise<T> {
  const start = Date.now();
  let last: unknown;
  for (;;) {
    try {
      return fn();
    } catch (error) {
      last = error;
    }
    if (Date.now() - start > timeout) {
      fail(`timed out waiting for ${what}: ${last instanceof Error ? last.message : String(last)}`);
    }
    await sleep(16);
  }
}

function query(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) fail(`not on the page: ${selector}`);
  return el;
}

function absent(selector: string): void {
  if (document.querySelector(selector)) fail(`should not be on the page: ${selector}`);
}

/** A short, stable name for an element, for messages about focus. */
function ident(el: Element | null): string {
  if (!el || el === document.body) return "page";
  const part = el.getAttribute("data-cy-part");
  return `${el.tagName.toLowerCase()}${part ? `[data-cy-part="${part}"]` : ""}`;
}

/**
 * The element as comparable text: tag, sorted attributes, children. Generated
 * ids are renamed in order of appearance, and `data-cy-entered` (React's own
 * re-parent marker) is left out, so two correct renderings always match.
 */
function shape(root: Element): string {
  const ids = new Map<string, string>();
  const idName = (v: string) => {
    if (!ids.has(v)) ids.set(v, `id-${ids.size + 1}`);
    return ids.get(v) as string;
  };
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
      return text ? JSON.stringify(text) : "";
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as Element;
    const attrs = el
      .getAttributeNames()
      .filter((n) => n !== "data-cy-entered")
      .sort()
      .map((n) => {
        const v = el.getAttribute(n) ?? "";
        if (n === "id") return `id=${idName(v)}`;
        if (n === "aria-labelledby" || n === "for") return `${n}=${idName(v)}`;
        return `${n}=${JSON.stringify(v)}`;
      });
    const children = Array.from(el.childNodes).map(walk).filter(Boolean);
    return `<${el.tagName.toLowerCase()} ${attrs.join(" ")}>${children.join("")}</>`;
  };
  return walk(root);
}

function sameAs(actual: Element, expected: UiNode, what: string): void {
  const a = shape(actual);
  const e = shape(renderToDom(expected));
  if (a !== e)
    fail(`${what} differs from @cookieyes/ui's markup.\n  drawn:    ${a}\n  expected: ${e}`);
}

function categoryModels(t: TranslationMap, granted: (id: string) => boolean) {
  const resolved = resolveCategories(undefined);
  return resolved.ids.map((id) => {
    const required = resolved.requiredIds.has(id);
    return {
      id,
      label: t.categories[id]?.label ?? id,
      description: t.categories[id]?.description ?? "",
      checked: required || granted(id),
      required,
    };
  });
}

function titleIdOf(selector: string): string {
  return query(selector).getAttribute("aria-labelledby") ?? "";
}

/**
 * Moves focus as a browser does for an unhandled Tab: to the next or previous
 * focusable element in the document. For drivers that run in jsdom, which
 * dispatches key events but never moves focus on its own.
 */
export async function pressInDocument(key: ConformanceKey): Promise<void> {
  const name = key === "Shift+Tab" ? "Tab" : key;
  const target = document.activeElement ?? document.body;
  const event = new KeyboardEvent("keydown", {
    key: name,
    shiftKey: key === "Shift+Tab",
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  if (name !== "Tab" || event.defaultPrevented) return;
  const all = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE));
  const at = all.indexOf(document.activeElement as HTMLElement);
  const next = key === "Shift+Tab" ? all[at - 1] : all[at + 1];
  next?.focus();
}

const GDPR: CookieYesConfig = { mode: "cookie-only", regulation: "GDPR" };
const CCPA: CookieYesConfig = { mode: "cookie-only", regulation: "CCPA" };

/**
 * The behaviour every CookieYes banner shares, whatever drew it: the parts and
 * attributes of each component in each state, keyboard and focus, screen-reader
 * announcements, theming, translations, and the server-rendered first paint.
 * An adapter is conformant when this suite passes against its driver.
 *
 * @example runConformance(reactDriver, { describe, it });
 */
export function runConformance(
  driver: ConformanceDriver,
  { describe, it }: ConformanceRunner,
): void {
  const t = defaultTranslations;

  /** Mounts, runs the body, and always unmounts. */
  const scenario =
    (config: CookieYesConfig, body: () => Promise<void>) => async (): Promise<void> => {
      await driver.mount(config);
      try {
        await body();
      } finally {
        await driver.unmount();
      }
    };

  describe(`${driver.name}: conformance with @cookieyes/ui`, () => {
    for (const config of [GDPR, CCPA]) {
      const regulation = config.regulation ?? "GDPR";
      it(
        `draws the ${regulation} banner and its live region as @cookieyes/ui describes them`,
        scenario(config, async () => {
          const wrap = await until(() => query(".cy-banner-wrap"), "the banner");
          sameAs(
            wrap,
            banner({ translations: t, regulation, titleId: titleIdOf("[data-cky-banner]") }),
            "the banner",
          );
          const live = query('[aria-live="assertive"]');
          sameAs(live, bannerAnnouncer(live.textContent ?? ""), "the announcer");
          absent('[data-cy-part="recall"]');
        }),
      );
    }

    it(
      "announces the banner title after the delay, assertively",
      scenario(GDPR, async () => {
        const live = await until(() => query('[aria-live="assertive"]'), "the announcer");
        await sleep(ANNOUNCE_DELAY_MS + 150);
        check(live.textContent === t.bannerTitle, `announced "${live.textContent}"`);
      }),
      ANNOUNCE_DELAY_MS + 3000,
    );

    it(
      "keeps Tab inside the banner and leaves Escape to the close button",
      scenario(GDPR, async () => {
        const card = await until(() => query("[data-cky-banner]"), "the banner");
        const items = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE));
        check(items.length === 5, `the banner has ${items.length} focusable controls, not 5`);
        (document.activeElement as HTMLElement | null)?.blur?.();
        await driver.press("Tab");
        check(
          document.activeElement === items[0],
          `Tab from the page landed on ${ident(document.activeElement)}`,
        );
        items[items.length - 1]?.focus();
        await driver.press("Tab");
        check(
          document.activeElement === items[0],
          "Tab on the last control did not wrap to the first",
        );
        await driver.press("Shift+Tab");
        check(
          document.activeElement === items[items.length - 1],
          "Shift+Tab on the first control did not wrap to the last",
        );
        await driver.press("Escape");
        query("[data-cky-banner]");
      }),
    );

    it(
      "hands focus to the recall button after a decision, and draws it as described",
      scenario(GDPR, async () => {
        const accept = await until(
          () => query('[data-cky-banner] [data-cy-part="accept-all"]'),
          "Accept All",
        );
        accept.focus();
        await driver.click(accept);
        const recall = await until(() => query('[data-cy-part="recall"]'), "the recall button");
        absent("[data-cky-banner]");
        sameAs(recall, recallButton(t), "the recall button");
        await until(
          () => check(document.activeElement === recall, ident(document.activeElement)),
          "focus on the recall button",
        );
      }),
    );

    it(
      "opens preferences from the banner, traps focus, switches state and returns focus on Escape",
      scenario(GDPR, async () => {
        const customise = await until(
          () => query('[data-cky-banner] [data-cy-part="customise"]'),
          "Customise",
        );
        customise.focus();
        await driver.click(customise);
        const overlay = await until(
          () => query('[data-cy-part="overlay"]'),
          "the preferences dialog",
        );
        await until(
          () => check(document.activeElement === overlay, ident(document.activeElement)),
          "focus on the dialog",
        );
        const draw = (granted: (id: string) => boolean) =>
          preferences({
            translations: t,
            titleId: titleIdOf('[data-cy-part="overlay"]'),
            categories: categoryModels(t, granted),
          });
        sameAs(
          overlay,
          draw(() => false),
          "the preferences dialog",
        );

        await driver.press("Tab");
        check(
          document.activeElement === overlay.querySelector('[data-cy-part="close"]'),
          `Tab from the dialog landed on ${ident(document.activeElement)}`,
        );

        const first = query('[data-cy-part="toggle"] input');
        await driver.click(first);
        await until(
          () =>
            check(query('[data-cy-part="toggle"]').getAttribute("data-cy-state") === "on", "off"),
          "the first switch to turn on",
        );
        const firstId = categoryModels(t, () => false).find((c) => !c.required)?.id;
        sameAs(
          query('[data-cy-part="overlay"]'),
          draw((id) => id === firstId),
          "the dialog after a switch",
        );

        await driver.press("Escape");
        await until(() => absent('[data-cy-part="overlay"]'), "the dialog to close");
        await until(
          () =>
            check(
              document.activeElement?.getAttribute("data-cy-part") === "customise",
              ident(document.activeElement),
            ),
          "focus back on Customise",
        );
      }),
    );

    it(
      "opens the opt-out dialog under CCPA and confirms an opt-out with a countdown",
      scenario(CCPA, async () => {
        const doNotSell = await until(
          () => query('[data-cky-banner] [data-cy-part="do-not-sell"]'),
          "Do Not Sell",
        );
        doNotSell.focus();
        await driver.click(doNotSell);
        const dialog = await until(() => query('[data-cy-part="optout"]'), "the opt-out dialog");
        const box = query('[data-cy-part="checkbox"]') as HTMLInputElement;
        const draw = (confirmation?: { secondsLeft: number }) =>
          optOut({
            translations: t,
            titleId: titleIdOf('[data-cy-part="optout"]'),
            checkboxId: box.id,
            optedOut: box.checked,
            confirmation,
          });
        sameAs(dialog, draw(), "the opt-out dialog");
        if (!box.checked) await driver.click(box);
        await driver.click(query('[data-cy-part="confirm"]'));
        const confirmed = await until(
          () => query('[data-cy-part="confirmation"]'),
          "the confirmation",
        );
        sameAs(query('[data-cy-part="optout"]'), draw({ secondsLeft: 10 }), "the confirmed dialog");
        await until(
          () => check(document.activeElement === confirmed, ident(document.activeElement)),
          "focus on the confirmation",
        );
        await until(
          () => check(query(".cy-optout-countdown").textContent === "9", "still 10"),
          "the countdown to tick",
          2500,
        );
      }),
      6000,
    );

    it(
      "reopens the choice from the recall button: preferences under GDPR",
      scenario(GDPR, async () => {
        await driver.click(await until(() => query('[data-cy-part="reject-all"]'), "Reject All"));
        const recall = await until(() => query('[data-cy-part="recall"]'), "the recall button");
        recall.focus();
        await driver.click(recall);
        await until(() => query('[data-cy-part="overlay"]'), "the preferences dialog");
        absent('[data-cy-part="recall"]');
        await driver.press("Escape");
        await until(
          () =>
            check(
              document.activeElement?.getAttribute("data-cy-part") === "recall",
              ident(document.activeElement),
            ),
          "focus back on the recall button",
        );
      }),
    );

    it(
      "shows the reload notice after revoking a tool that needs a reload",
      scenario(
        {
          ...GDPR,
          // A tool whose stop throws cannot be stopped cleanly, so revoking
          // its category asks for a reload.
          customStopHandlers: [
            {
              id: "conformance-tool",
              category: "analytics",
              stop: () => {
                throw new Error("this tool has no clean stop");
              },
            },
          ],
        },
        async () => {
          absent('[data-cy-part="reload-notice"]');
          await driver.click(await until(() => query('[data-cy-part="accept-all"]'), "Accept All"));
          await driver.click(
            await until(() => query('[data-cy-part="recall"]'), "the recall button"),
          );
          await driver.click(
            await until(
              () => query('[data-cy-part="overlay"] [data-cy-part="reject-all"]'),
              "Reject All",
            ),
          );
          const notice = await until(
            () => query('[data-cy-part="reload-notice"]'),
            "the reload notice",
          );
          sameAs(notice, reloadNotice(t), "the reload notice");
          await driver.click(query('[data-cy-part="reload-dismiss"]'));
          await until(() => absent('[data-cy-part="reload-notice"]'), "the notice to go");
        },
      ),
    );

    it(
      "applies an explicit colour scheme and a custom theme to the banner",
      scenario({ ...GDPR, colorScheme: "dark", theme: { primaryColor: "#7c3aed" } }, async () => {
        const wrap = await until(() => query(".cy-banner-wrap"), "the banner");
        check(
          wrap.getAttribute("data-cy-scheme") === "dark",
          "no data-cy-scheme=dark on the banner",
        );
        await until(
          () => check(wrap.style.getPropertyValue("--cy-primary") === "#7c3aed", "not applied"),
          "the theme's primary colour",
        );
      }),
    );

    it(
      "switches every visible and spoken text with the language",
      scenario(
        {
          ...GDPR,
          i18n: {
            messages: {
              de: {
                bannerTitle: "Wir respektieren Ihre Privatsphäre",
                acceptAll: "Alle akzeptieren",
                bannerCloseLabel: "Schließen",
                poweredBy: "Bereitgestellt von CookieYes",
              },
            },
          },
        },
        async () => {
          await until(() => query("[data-cky-banner]"), "the banner");
          await driver.setLanguage("de");
          await until(
            () =>
              check(
                query('[data-cy-part="title"]').textContent ===
                  "Wir respektieren Ihre Privatsphäre",
                "title",
              ),
            "the translated title",
          );
          check(
            query('[data-cy-part="accept-all"]').textContent === "Alle akzeptieren",
            "button text",
          );
          check(
            query('[data-cky-banner] [data-cy-part="close"]').getAttribute("aria-label") ===
              "Schließen",
            "close label",
          );
          check(
            query('[data-cy-part="branding"]').textContent === "Bereitgestellt von",
            "branding text",
          );
        },
      ),
    );

    it(
      "has no automatically detectable accessibility problems in the banner and dialogs",
      scenario(GDPR, async () => {
        const axe = (await import("axe-core")).default;
        const audit = async (el: Element, what: string) => {
          const result = await axe.run(el, { rules: { "color-contrast": { enabled: false } } });
          const found = result.violations.map((v) => `${v.id} (${v.nodes.length})`).join(", ");
          check(result.violations.length === 0, `${what}: ${found}`);
        };
        await audit(await until(() => query("[data-cky-banner]"), "the banner"), "the banner");
        await driver.click(query('[data-cy-part="customise"]'));
        await audit(
          await until(() => query('[data-cy-part="overlay"]'), "the dialog"),
          "preferences",
        );
      }),
      // axe-core audits every node of the banner and the dialog; in jsdom on a busy CI
      // runner that alone took just over the 5 s default, for React and vanilla alike.
      30_000,
    );

    if (driver.serverHtml) {
      const serverHtml = driver.serverHtml;
      it("sends the banner in its first HTML, styled without inline style attributes", async () => {
        const html = await serverHtml(GDPR);
        check(html.includes("data-cky-banner"), "the first HTML has no banner");
        check(html.includes(t.bannerTitle), "the first HTML has no banner title");
        check(!/\sstyle="/.test(html), "the first HTML carries a style attribute");
      });
    }
  });
}
