import { render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { portal } from "../primitives/portal.js";
import {
  chain,
  useAutoFocusDialog,
  useEscapeKey,
  useFocusTrap,
} from "../primitives/utils.svelte.js";
import HookProbe from "./fixtures/HookProbe.svelte";
import { makeFlag } from "./flag.svelte.js";
import { pressTab, settle } from "./test-utils.js";

afterEach(() => {
  document.getElementById("cookieyes-portal-root")?.remove();
  document.body.innerHTML = "";
});

describe("chain", () => {
  it("runs the user handler then the default handler", () => {
    const def = vi.fn();
    const user = vi.fn();
    chain(user, def)({ defaultPrevented: false });
    expect(user).toHaveBeenCalledTimes(1);
    expect(def).toHaveBeenCalledTimes(1);
  });

  it("skips the default handler when the user prevents default", () => {
    const def = vi.fn();
    const user = (e: { defaultPrevented: boolean }) => {
      e.defaultPrevented = true;
    };
    chain(user, def)({ defaultPrevented: false });
    expect(def).not.toHaveBeenCalled();
  });

  it("works with no user handler", () => {
    const def = vi.fn();
    chain(undefined, def)({ defaultPrevented: false });
    expect(def).toHaveBeenCalledTimes(1);
  });

  it("ignores a handler that is not a function", () => {
    const def = vi.fn();
    chain("nope", def)({ defaultPrevented: false });
    expect(def).toHaveBeenCalledTimes(1);
  });
});

describe("useEscapeKey", () => {
  it("invokes the callback on Escape only while enabled", async () => {
    const onEscape = vi.fn();
    const enabled = makeFlag(true);
    render(HookProbe, { props: { use: () => useEscapeKey(() => enabled.value, onEscape) } });
    await settle();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onEscape).toHaveBeenCalledTimes(1);

    // A non-Escape key does nothing.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(onEscape).toHaveBeenCalledTimes(1);

    // Disabling removes the listener.
    enabled.value = false;
    await settle();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("stops listening when the component is destroyed", async () => {
    const onEscape = vi.fn();
    const view = render(HookProbe, { props: { use: () => useEscapeKey(() => true, onEscape) } });
    await settle();
    view.unmount();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onEscape).not.toHaveBeenCalled();
  });
});

describe("useFocusTrap", () => {
  async function setup(): Promise<{
    container: HTMLElement;
    first: HTMLElement;
    last: HTMLElement;
  }> {
    document.body.innerHTML = "";
    const container = document.createElement("div");
    const first = document.createElement("button");
    first.textContent = "first";
    const last = document.createElement("button");
    last.textContent = "last";
    container.append(first, last);
    document.body.appendChild(container);
    render(HookProbe, {
      props: {
        use: () =>
          useFocusTrap(
            () => true,
            () => container,
          ),
      },
    });
    await settle();
    return { container, first, last };
  }

  it("wraps focus from last to first on Tab", async () => {
    const { first, last } = await setup();
    last.focus();
    pressTab();
    expect(document.activeElement).toBe(first);
  });

  it("wraps focus from first to last on Shift+Tab", async () => {
    const { first, last } = await setup();
    first.focus();
    pressTab(true);
    expect(document.activeElement).toBe(last);
  });

  it("pulls focus from outside the container to the first control on Tab", async () => {
    const { first } = await setup();
    pressTab();
    expect(document.activeElement).toBe(first);
  });

  it("pulls focus from the container itself to the last control on Shift+Tab", async () => {
    const { container, last } = await setup();
    container.tabIndex = -1;
    container.focus();
    pressTab(true);
    expect(document.activeElement).toBe(last);
  });

  it("ignores non-Tab keys", async () => {
    const { first } = await setup();
    first.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(document.activeElement).toBe(first);
  });
});

describe("useAutoFocusDialog", () => {
  it("focuses the dialog when it opens and gives focus back to the opener when it closes", async () => {
    const opener = document.createElement("button");
    const dialog = document.createElement("div");
    dialog.tabIndex = -1;
    document.body.append(opener, dialog);
    opener.focus();
    const open = makeFlag(false);
    render(HookProbe, {
      props: {
        use: () =>
          useAutoFocusDialog(
            () => open.value,
            () => dialog,
          ),
      },
    });
    const { rememberOpener } = await import("@cookieyes/ui");
    rememberOpener();
    open.value = true;
    await settle();
    expect(document.activeElement).toBe(dialog);
    open.value = false;
    await settle();
    expect(document.activeElement).toBe(opener);
  });
});

describe("portal", () => {
  it("moves the node into the portal root and removes it on destroy", () => {
    const node = document.createElement("div");
    document.body.append(node);
    const action = portal(node);
    const root = document.getElementById("cookieyes-portal-root");
    expect(root?.contains(node)).toBe(true);
    expect(document.body.firstElementChild).toBe(root);
    action.destroy();
    expect(node.isConnected).toBe(false);
  });
});
