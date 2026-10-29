import { afterEach, describe, expect, it, vi } from "vitest";
import { ANNOUNCE_DELAY_MS, announceBanner } from "../behaviour/announce.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("announceBanner", () => {
  it("writes the text after the delay, not before", () => {
    vi.useFakeTimers();
    const write = vi.fn();
    announceBanner("We value your privacy", write);
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS - 1);
    expect(write).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(write).toHaveBeenCalledWith("We value your privacy");
  });

  it("cancels an announcement that has not happened yet", () => {
    vi.useFakeTimers();
    const write = vi.fn();
    const cancel = announceBanner("text", write);
    cancel();
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
    expect(write).not.toHaveBeenCalled();
  });
});
