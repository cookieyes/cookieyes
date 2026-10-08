import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyJson, copyText } from "../lib/copy-json.js";

// jsdom has no clipboard; give each test one to spy on.
beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: async () => undefined },
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("copy helpers", () => {
  it("copy text and pretty JSON to the clipboard", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    expect(await copyText("hi")).toBe(true);
    expect(await copyJson({ a: 1 })).toBe(true);
    expect(writeText).toHaveBeenNthCalledWith(1, "hi");
    expect(writeText).toHaveBeenNthCalledWith(2, '{\n  "a": 1\n}');
  });

  it("resolve false when there is no clipboard", async () => {
    Reflect.deleteProperty(navigator, "clipboard");
    expect(await copyText("hi")).toBe(false);
    expect(await copyJson({})).toBe(false);
  });

  it("resolve false instead of throwing when the clipboard refuses", async () => {
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    expect(await copyText("hi")).toBe(false);
    expect(await copyJson({})).toBe(false);
  });
});
