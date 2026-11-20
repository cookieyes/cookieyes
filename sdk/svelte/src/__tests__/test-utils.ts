import { _clearStopHandlers, type CookieYesConfig } from "@cookieyes/core";
import { cleanup, render } from "@testing-library/svelte";
import type { Component } from "svelte";
import { tick } from "svelte";
import { vi } from "vitest";
import { _resetServerFirst } from "../hooks/server-first.js";
import { resetCookieYes } from "../runtime.js";
import Harness from "./fixtures/Harness.svelte";
import HookProbe from "./fixtures/HookProbe.svelte";

/** Wipes the persisted consent cookie so each test starts fresh. */
export function clearCookie(): void {
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
}

/** A cookie-only config for the given regulation. */
export function cookieOnly(regulation: "GDPR" | "CCPA" | "DEFAULT" = "GDPR"): CookieYesConfig {
  return { mode: "cookie-only", regulation };
}

/** Lets a state change and the render and portal move it causes finish. */
export async function settle(): Promise<void> {
  for (let i = 0; i < 4; i++) await tick();
}

/** What the tests use of a mounted component. */
export type MountedView = {
  container: HTMLElement;
  unmount: () => void;
  rerender: (props: Record<string, unknown>) => Promise<void>;
};

type ProviderProps = Partial<
  Omit<Parameters<typeof Harness>[1], "config" | "component" | "componentProps">
>;

/** Mounts `component` (an empty one by default) under a provider started from `config`. */
export function mountWith(
  config: CookieYesConfig,
  component?: Component<any>,
  props: Record<string, unknown> = {},
  provider: ProviderProps = {},
): MountedView {
  return render(Harness, {
    props: { config, component, componentProps: props, ...provider },
  } as never) as unknown as MountedView;
}

/** Runs `use` inside a mounted component's initialisation, like `renderHook`, and returns it. */
export function renderHook<T>(
  use: () => T,
  config: CookieYesConfig = cookieOnly(),
  provider: ProviderProps = {},
): { result: T } & MountedView {
  let result: T | undefined;
  const rendered = mountWith(
    config,
    HookProbe,
    {
      use: () => {
        result = use();
      },
    },
    provider,
  );
  return { result: result as T, ...rendered };
}

/** Spies on `console.warn` and `console.error`; `messages()` returns what they were called with. */
export function spyConsole(): { messages: () => string[]; warn: ReturnType<typeof vi.spyOn> } {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
  return {
    warn,
    messages: () =>
      [...warn.mock.calls, ...error.mock.calls].map((args) => args.map(String).join(" ")),
  };
}

/** Standard afterEach: unmount everything, drop the runtime, clear the cookie and the portal. */
export function unmountAll(): void {
  cleanup();
  resetCookieYes();
  _resetServerFirst();
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
  await settle();
}

/** Dispatches a Tab key press on the document, as the focus trap listens there. */
export function pressTab(shiftKey = false): void {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey }));
}
