import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCookieYes } from "../runtime.js";
import AsChild from "./fixtures/AsChild.svelte";
import { clearCookie, click, cookieOnly, mountWith, settle, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

describe("child snippet: swap in your own element", () => {
  it("renders the developer's element instead of our button, with our part merged", async () => {
    mountWith(cookieOnly("GDPR"), AsChild, { variant: "anchor" });
    await settle();
    const el = document.querySelector('[data-testid="mine"]');
    expect(el?.tagName).toBe("A");
    expect(el?.getAttribute("data-cy-part")).toBe("accept-all");
    expect(document.querySelector('button[data-cy-part="accept-all"]')).toBeNull();
  });

  it("runs both the child's handler and our consent action on click", async () => {
    const onchildclick = vi.fn();
    mountWith(cookieOnly("GDPR"), AsChild, { variant: "button", onchildclick });
    await settle();
    await click(document.querySelector('[data-testid="mine"]'));
    expect(onchildclick).toHaveBeenCalledTimes(1);
    const snapshot = getCookieYes().getSnapshot();
    expect(snapshot.hasActed).toBe(true);
    expect(snapshot.committedCategories.analytics).toBe(true);
  });

  it("skips our consent action when the caller's handler prevents default", async () => {
    mountWith(cookieOnly("GDPR"), AsChild, { variant: "prevent" });
    await settle();
    await click(document.querySelector('[data-testid="mine"]'));
    expect(getCookieYes().getSnapshot().hasActed).toBe(false);
  });

  it("carries the caller's class onto the swapped element", async () => {
    mountWith(cookieOnly("GDPR"), AsChild, { variant: "class" });
    await settle();
    const el = document.querySelector('[data-testid="mine"]');
    expect(el?.classList.contains("mine")).toBe(true);
    expect(el?.getAttribute("data-cy-part")).toBe("reject-all");
  });

  it("gives the element the behaviour of the part: type and our action", async () => {
    mountWith(cookieOnly("GDPR"), AsChild, { variant: "reject" });
    await settle();
    const el = document.querySelector<HTMLButtonElement>('[data-testid="mine"]');
    expect(el?.getAttribute("type")).toBe("button");
    await click(el);
    expect(getCookieYes().getSnapshot().hasActed).toBe(true);
    expect(getCookieYes().getSnapshot().committedCategories.analytics).toBe(false);
  });
});
