import { describe, expect, it, vi } from "vitest";
import { createConsentEmitter } from "../events.js";
import type { ConsentEventPayload } from "../types.js";

/** Emitter over a mutable committed-state ref, mirroring how the runtime feeds it. */
function setup(initial: Record<string, boolean> = { necessary: true, analytics: false }) {
  let committed = { ...initial };
  const emitter = createConsentEmitter(() => committed);
  const save = (next: Record<string, boolean>) => {
    committed = { ...next };
    emitter.push(committed);
  };
  return { emitter, save };
}

describe("createConsentEmitter", () => {
  it("replays current state immediately on attach with isInitial: true", () => {
    const { emitter } = setup({ necessary: true, analytics: true });
    const seen: ConsentEventPayload[] = [];
    emitter.on("change", (p) => seen.push(p));

    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual({
      categories: { necessary: true, analytics: true },
      changedCategories: [],
      isInitial: true,
    });
  });

  it('"save" fires on every save, even when nothing changed', () => {
    const { emitter, save } = setup({ necessary: true, analytics: false });
    const fn = vi.fn();
    emitter.on("save", fn); // 1: initial replay
    save({ necessary: true, analytics: true }); // 2: real change
    save({ necessary: true, analytics: true }); // 3: unchanged re-confirm

    expect(fn).toHaveBeenCalledTimes(3);
    expect(fn.mock.calls[2][0]).toMatchObject({ changedCategories: [], isInitial: false });
  });

  it('"change" fires only when a category actually differs', () => {
    const { emitter, save } = setup({ necessary: true, analytics: false });
    const fn = vi.fn();
    emitter.on("change", fn); // 1: initial replay
    save({ necessary: true, analytics: true }); // fires (changed)
    save({ necessary: true, analytics: true }); // no fire (unchanged)
    save({ necessary: true, analytics: false }); // fires (changed back)

    expect(fn).toHaveBeenCalledTimes(3);
    expect(fn.mock.calls[1][0]).toMatchObject({
      changedCategories: ["analytics"],
      isInitial: false,
    });
  });

  it("only notifies a per-category listener when that category changes", () => {
    const { emitter, save } = setup({ necessary: true, analytics: false, ads: false });
    const fn = vi.fn();
    emitter.on("change", fn, { category: "ads" }); // 1: initial replay (always delivered)
    save({ necessary: true, analytics: true, ads: false }); // analytics only — no fire
    save({ necessary: true, analytics: true, ads: true }); // ads changed — fires

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls[0][0].isInitial).toBe(true);
    expect(fn.mock.calls[1][0]).toMatchObject({ changedCategories: ["ads"], isInitial: false });
  });

  it("stops notifying after unsubscribe", () => {
    const { emitter, save } = setup();
    const fn = vi.fn();
    const off = emitter.on("save", fn);
    off();
    save({ necessary: true, analytics: true });

    expect(fn).toHaveBeenCalledTimes(1); // only the initial replay
  });

  it("keeps other listeners running when one throws", () => {
    const { emitter, save } = setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    const good = vi.fn();
    emitter.on("save", bad);
    emitter.on("save", good);
    save({ necessary: true, analytics: true });

    expect(bad).toHaveBeenCalled();
    expect(good).toHaveBeenCalledTimes(2); // initial replay + the save
  });

  it("is safe when a listener unsubscribes itself mid-fire", () => {
    const { emitter, save } = setup();
    const other = vi.fn();
    let off: () => void = () => {};
    const selfRemoving = vi.fn(() => off());
    off = emitter.on("save", selfRemoving);
    emitter.on("save", other);
    save({ necessary: true, analytics: true });

    // selfRemoving fired its initial replay then removed itself on that call;
    // `other` must still receive both its replay and the save without error.
    expect(other).toHaveBeenCalledTimes(2);
  });
});
