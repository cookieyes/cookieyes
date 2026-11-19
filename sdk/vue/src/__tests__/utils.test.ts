import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, type ShallowRef, shallowRef } from "vue";
import { chain, exposeElement, useEscapeKey, useFocusTrap } from "../primitives/utils.js";
import { pressTab } from "./test-utils.js";

let wrapper: VueWrapper | undefined;

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
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

  it("runs every handler of a repeated listener, in order, then the default", () => {
    const calls: string[] = [];
    chain([() => calls.push("a"), () => calls.push("b")], () => calls.push("default"))({
      defaultPrevented: false,
    });
    expect(calls).toEqual(["a", "b", "default"]);
  });

  it("ignores a listener that is not a function", () => {
    const def = vi.fn();
    chain("nope", def)({ defaultPrevented: false });
    expect(def).toHaveBeenCalledTimes(1);
  });
});

describe("exposeElement", () => {
  it("exposes the bound node as `element`", async () => {
    const Comp = defineComponent({
      setup(_, { expose }) {
        const el = exposeElement(expose);
        return () => h("p", { ref: el, id: "node" });
      },
    });
    wrapper = mount(Comp, { attachTo: document.body });
    await flushPromises();
    expect((wrapper.vm as unknown as { element: HTMLElement }).element).toBe(
      document.getElementById("node"),
    );
  });
});

describe("useEscapeKey", () => {
  it("invokes the callback on Escape only while enabled", async () => {
    const onEscape = vi.fn();
    const enabled = shallowRef(true);
    wrapper = mount(
      defineComponent({
        setup() {
          useEscapeKey(enabled, onEscape);
          return () => h("div");
        },
      }),
    );

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onEscape).toHaveBeenCalledTimes(1);

    // A non-Escape key does nothing.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(onEscape).toHaveBeenCalledTimes(1);

    // Disabling removes the listener.
    enabled.value = false;
    await nextTick();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("stops listening when the component unmounts", () => {
    const onEscape = vi.fn();
    const w = mount(
      defineComponent({
        setup() {
          useEscapeKey(() => true, onEscape);
          return () => h("div");
        },
      }),
    );
    w.unmount();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onEscape).not.toHaveBeenCalled();
  });
});

describe("useFocusTrap", () => {
  function setup(): { container: HTMLElement; first: HTMLElement; last: HTMLElement } {
    document.body.innerHTML = "";
    const container = document.createElement("div");
    const first = document.createElement("button");
    first.textContent = "first";
    const last = document.createElement("button");
    last.textContent = "last";
    container.append(first, last);
    document.body.appendChild(container);
    const el: ShallowRef<HTMLElement | null> = shallowRef(container);
    wrapper = mount(
      defineComponent({
        setup() {
          useFocusTrap(() => true, el);
          return () => h("span");
        },
      }),
    );
    return { container, first, last };
  }

  it("wraps focus from last to first on Tab", () => {
    const { first, last } = setup();
    last.focus();
    pressTab();
    expect(document.activeElement).toBe(first);
  });

  it("wraps focus from first to last on Shift+Tab", () => {
    const { first, last } = setup();
    first.focus();
    pressTab(true);
    expect(document.activeElement).toBe(last);
  });

  it("pulls focus from outside the container to the first control on Tab", () => {
    const { first } = setup();
    pressTab();
    expect(document.activeElement).toBe(first);
  });

  it("pulls focus from the container itself to the last control on Shift+Tab", () => {
    const { container, last } = setup();
    container.tabIndex = -1;
    container.focus();
    pressTab(true);
    expect(document.activeElement).toBe(last);
  });

  it("ignores non-Tab keys", () => {
    const { first } = setup();
    first.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(document.activeElement).toBe(first);
  });
});
