import { act, cleanup, renderHook } from "@testing-library/react";
import type { RefObject, SyntheticEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { chain, useEscapeKey, useFocusTrap } from "../primitives/utils.js";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("chain", () => {
  it("runs the user handler then the default handler", () => {
    const def = vi.fn();
    const user = vi.fn();
    chain(user, def)({ defaultPrevented: false } as SyntheticEvent);
    expect(user).toHaveBeenCalledTimes(1);
    expect(def).toHaveBeenCalledTimes(1);
  });

  it("skips the default handler when the user prevents default", () => {
    const def = vi.fn();
    const user = (e: SyntheticEvent) => {
      (e as { defaultPrevented: boolean }).defaultPrevented = true;
    };
    chain(user, def)({ defaultPrevented: false } as SyntheticEvent);
    expect(def).not.toHaveBeenCalled();
  });

  it("works with no user handler", () => {
    const def = vi.fn();
    chain(undefined, def)({ defaultPrevented: false } as SyntheticEvent);
    expect(def).toHaveBeenCalledTimes(1);
  });
});

describe("useEscapeKey", () => {
  it("invokes the callback on Escape only while enabled", () => {
    const onEscape = vi.fn();
    const { rerender } = renderHook(({ enabled }) => useEscapeKey(enabled, onEscape), {
      initialProps: { enabled: true },
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onEscape).toHaveBeenCalledTimes(1);

    // A non-Escape key does nothing.
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    });
    expect(onEscape).toHaveBeenCalledTimes(1);

    // Disabling removes the listener.
    rerender({ enabled: false });
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });
});

describe("useFocusTrap", () => {
  function setup() {
    document.body.innerHTML = "";
    const container = document.createElement("div");
    const first = document.createElement("button");
    first.textContent = "first";
    const last = document.createElement("button");
    last.textContent = "last";
    container.append(first, last);
    document.body.appendChild(container);
    const ref: RefObject<HTMLDivElement> = { current: container };
    renderHook(() => {
      useFocusTrap(true, ref);
      return null;
    });
    return { container, first, last };
  }

  it("wraps focus from last to first on Tab", () => {
    const { first, last } = setup();
    last.focus();
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    });
    expect(document.activeElement).toBe(first);
  });

  it("wraps focus from first to last on Shift+Tab", () => {
    const { first, last } = setup();
    first.focus();
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true }));
    });
    expect(document.activeElement).toBe(last);
  });

  it("ignores non-Tab keys", () => {
    const { first } = setup();
    first.focus();
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });
    expect(document.activeElement).toBe(first);
  });
});
