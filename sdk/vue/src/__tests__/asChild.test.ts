import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { Banner } from "../primitives/Banner.js";
import { getCookieYes } from "../runtime.js";
import { clearCookie, click, cookieOnly, mountWith, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

/** A banner root around one `asChild` button built by `child`. */
function withChild(child: () => ReturnType<typeof h>, part = Banner.AcceptAll) {
  return defineComponent({
    render: () =>
      h(Banner.Root, null, { default: () => h(part, { asChild: true }, { default: child }) }),
  });
}

describe("asChild: swap in your own element", () => {
  it("renders the developer's element instead of our button, with our part merged", async () => {
    mountWith(
      cookieOnly("GDPR"),
      withChild(() => h("a", { href: "#accept", "data-testid": "mine" }, "Accept")),
    );
    await flushPromises();

    const el = document.querySelector('[data-testid="mine"]');
    expect(el?.tagName).toBe("A");
    expect(el?.getAttribute("data-cy-part")).toBe("accept-all");
    expect(document.querySelector('button[data-cy-part="accept-all"]')).toBeNull();
  });

  it("runs both the child's handler and our consent action on click", async () => {
    const childClick = vi.fn();
    mountWith(
      cookieOnly("GDPR"),
      withChild(() =>
        h("button", { type: "button", "data-testid": "mine", onClick: childClick }, "Accept"),
      ),
    );
    await flushPromises();

    await click(document.querySelector('[data-testid="mine"]'));

    expect(childClick).toHaveBeenCalledTimes(1);
    const snapshot = getCookieYes().getSnapshot();
    expect(snapshot.hasActed).toBe(true);
    expect(snapshot.committedCategories.analytics).toBe(true);
  });

  it("skips our consent action when the child's handler prevents default", async () => {
    mountWith(
      cookieOnly("GDPR"),
      withChild(() =>
        h("button", { "data-testid": "mine", onClick: (e: Event) => e.preventDefault() }, "Accept"),
      ),
    );
    await flushPromises();

    await click(document.querySelector('[data-testid="mine"]'));

    expect(getCookieYes().getSnapshot().hasActed).toBe(false);
  });

  it("merges class onto the swapped element without dropping the child's own", async () => {
    mountWith(
      cookieOnly("GDPR"),
      withChild(
        () => h("button", { type: "button", class: "mine", "data-testid": "mine" }, "Reject"),
        Banner.RejectAll,
      ),
    );
    await flushPromises();

    const el = document.querySelector('[data-testid="mine"]');
    expect(el?.classList.contains("mine")).toBe(true);
    expect(el?.getAttribute("data-cy-part")).toBe("reject-all");
  });

  it("exposes the developer's element through the part's ref", async () => {
    let part: { element: HTMLElement | null } | null = null;
    mountWith(
      cookieOnly("GDPR"),
      defineComponent({
        render: () =>
          h(Banner.Root, null, {
            default: () =>
              h(
                Banner.AcceptAll,
                { asChild: true, ref: (instance: unknown) => (part = instance as typeof part) },
                { default: () => h("a", { href: "#a" }, "Accept") },
              ),
          }),
      }),
    );
    await flushPromises();

    expect(part).not.toBeNull();
    expect((part as unknown as { element: HTMLElement }).element.tagName).toBe("A");
  });
});
