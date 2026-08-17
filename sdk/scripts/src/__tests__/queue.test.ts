import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueue, flushQueue } from "../queue.js";

const tag = () => (window as unknown as { myTag?: unknown }).myTag;
const clear = () => {
  (window as unknown as { myTag?: unknown }).myTag = undefined;
};

beforeEach(clear);
afterEach(clear);

describe("createQueue / flushQueue", () => {
  it("queues method calls made before flush", () => {
    const q = createQueue("myTag", ["track", "page"]);
    q.track("Signup", { plan: "pro" });
    q.page();
    expect(tag()).toBe(q);
    expect(q.length).toBe(2);
    expect(q[0]).toEqual(["track", "Signup", { plan: "pro" }]);
    expect(q[1]).toEqual(["page"]);
  });

  it("returns the existing stub if one is already created", () => {
    const a = createQueue("myTag", ["track"]);
    const b = createQueue("myTag", ["track"]);
    expect(a).toBe(b);
  });

  it("flushQueue replays queued calls and rewires methods to the handler", () => {
    const q = createQueue("myTag", ["track"]);
    q.track("Before");
    const handle = vi.fn();
    flushQueue("myTag", handle);
    expect(handle).toHaveBeenCalledWith("track", "Before"); // queued call caught up
    (q.track as (...a: unknown[]) => unknown)("After");
    expect(handle).toHaveBeenCalledWith("track", "After"); // later calls go direct
    expect(q.length).toBe(0); // queue drained
  });

  it("flushQueue on a missing stub is a no-op", () => {
    expect(() => flushQueue("nope", () => {})).not.toThrow();
  });
});
