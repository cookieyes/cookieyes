import { _clearStopHandlers, type CookieYesConfig } from "@cookieyes/core";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { vi } from "vitest";
import { type App, type Component, createApp, createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { CookieYes } from "../plugin.js";
import { resetCookieYes } from "../runtime.js";

const wrappers: VueWrapper[] = [];
const apps: App[] = [];

/** Wipes the persisted consent cookie so each test starts fresh. */
export function clearCookie(): void {
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
}

/** A cookie-only config for the given regulation. */
export function cookieOnly(regulation: "GDPR" | "CCPA" | "DEFAULT" = "GDPR"): CookieYesConfig {
  return { mode: "cookie-only", regulation };
}

/** Mounts `component` (an empty one by default) in a fresh app with the plugin installed. */
export function mountWith(config: CookieYesConfig, component?: Component): VueWrapper {
  const wrapper = mount(component ?? defineComponent({ render: () => h("div") }), {
    attachTo: document.body,
    global: { plugins: [[CookieYes, config]] },
  });
  wrappers.push(wrapper);
  return wrapper;
}

/** Runs `use` inside a mounted component's setup, like `renderHook`, and returns its result. */
export function renderComposable<T>(
  use: () => T,
  config: CookieYesConfig = cookieOnly(),
): { result: T; wrapper: VueWrapper } {
  let result: T | undefined;
  const wrapper = mountWith(
    config,
    defineComponent({
      setup() {
        result = use();
        return () => h("div");
      },
    }),
  );
  return { result: result as T, wrapper };
}

/** Renders `factory` to a string on the server side of a fresh app with the plugin installed. */
export async function ssr(factory: () => Component, config: CookieYesConfig): Promise<string> {
  const app = createSSRApp(factory());
  app.use(CookieYes, config);
  return renderToString(app);
}

/** Hydrates server `html` in a fresh container and waits for the post-mount update. */
export async function hydrate(
  html: string,
  factory: () => Component,
  config: CookieYesConfig,
): Promise<{ app: App; container: HTMLElement }> {
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.append(container);
  const app = createSSRApp(factory());
  app.use(CookieYes, config);
  app.mount(container);
  apps.push(app);
  await flushPromises();
  return { app, container };
}

/** Mounts a bare app with the plugin installed, for tests that need no component. */
export function installOnly(config: CookieYesConfig): App {
  const app = createApp({ render: () => null });
  app.use(CookieYes, config);
  return app;
}

/**
 * Spies on `console.warn` and `console.error`. `vueWarnings()` returns every `[Vue warn]`
 * message, which includes hydration mismatches.
 */
export function spyWarn(): { vueWarnings: () => string[]; warn: ReturnType<typeof vi.spyOn> } {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
  return {
    warn,
    vueWarnings: () =>
      [...warn.mock.calls, ...error.mock.calls]
        .map((args) => args.map(String).join(" "))
        .filter((message) => message.includes("[Vue warn]")),
  };
}

/** Standard afterEach: unmount everything, drop the runtime, clear the cookie and the portal. */
export function unmountAll(): void {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  for (const app of apps.splice(0)) app.unmount();
  resetCookieYes();
  _clearStopHandlers();
  clearCookie();
  document.getElementById("cookieyes-portal-root")?.remove();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
}

/** The element whose own text is exactly `text`, within `selector`; throws when none matches. */
export function getByText(text: string, selector = "*"): HTMLElement {
  const found = queryByText(text, selector);
  if (!found) throw new Error(`no element with text "${text}"`);
  return found;
}

/** Like {@link getByText}, but null when nothing matches. */
export function queryByText(text: string, selector = "*"): HTMLElement | null {
  const own = (el: Element) =>
    Array.from(el.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? "")
      .join("")
      .trim();
  return (
    Array.from(document.body.querySelectorAll<HTMLElement>(selector)).find(
      (el) => own(el) === text,
    ) ?? null
  );
}

/** Clicks an element and waits for the resulting update, like a user would. */
export async function click(el: Element | null): Promise<void> {
  if (!el) throw new Error("nothing to click");
  (el as HTMLElement).click();
  await flushPromises();
}

/** Dispatches a Tab key press on the document, as the focus trap listens there. */
export function pressTab(shiftKey = false): void {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey }));
}
