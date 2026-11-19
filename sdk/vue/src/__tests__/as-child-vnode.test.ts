import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Comment, defineComponent, Fragment, h, type VNode } from "vue";
import { Banner } from "../primitives/Banner.js";
import { getCookieYes } from "../runtime.js";
import { clearCookie, click, cookieOnly, mountWith, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

/** One `asChild` Accept All whose child is `child`, with extra attributes on the part. */
function asChild(child: () => VNode | VNode[], attrs: Record<string, unknown> = {}) {
  return defineComponent({
    render: () => h(Banner.AcceptAll, { asChild: true, ...attrs }, { default: child }),
  });
}

const TEMPLATE_PARTS = { BannerClose: Banner.Close, BannerAcceptAll: Banner.AcceptAll };

describe("asChild: the single child", () => {
  it("throws when there is no child", () => {
    expect(() =>
      mountWith(
        cookieOnly(),
        asChild(() => []),
      ),
    ).toThrow("[cookieyes] `asChild` expects exactly one element child.");
  });

  it("throws when there are several children", () => {
    expect(() =>
      mountWith(
        cookieOnly(),
        asChild(() => [h("a"), h("b")]),
      ),
    ).toThrow("`asChild` expects exactly one element child.");
  });

  it("throws when the child is text", () => {
    expect(() =>
      mountWith(
        cookieOnly(),
        asChild(() => [h(Fragment, null, ["just text"])]),
      ),
    ).toThrow("`asChild` expects exactly one element child.");
  });

  it("looks through fragments and ignores comments and whitespace text", async () => {
    mountWith(
      cookieOnly(),
      asChild(() => [
        h(Comment, "note"),
        h(Fragment, null, [" ", h("a", { id: "only" }, "Accept")]),
        h(Fragment, null, ["\n"]),
      ]),
    );
    await flushPromises();
    expect(document.getElementById("only")?.getAttribute("data-cy-part")).toBe("accept-all");
  });

  it("works when the child is a component", async () => {
    const MyButton = defineComponent({ render: () => h("button", { id: "mine" }, "Accept") });
    mountWith(
      cookieOnly(),
      asChild(() => h(MyButton)),
    );
    await flushPromises();

    await click(document.getElementById("mine"));
    expect(getCookieYes().getSnapshot().hasActed).toBe(true);
  });
});

describe("asChild: merging props", () => {
  it("lets the child's own props win over ours", async () => {
    mountWith(
      cookieOnly(),
      asChild(() => h("button", { id: "mine", "data-cy-part": "custom", "aria-haspopup": "menu" })),
    );
    await flushPromises();
    expect(document.getElementById("mine")?.getAttribute("data-cy-part")).toBe("custom");
  });

  it("calls each of the child's repeated handlers once, before our action", async () => {
    const calls: string[] = [];
    mountWith(
      cookieOnly(),
      asChild(() =>
        h("button", {
          id: "mine",
          onClick: [() => calls.push("first"), () => calls.push("second")],
        }),
      ),
    );
    await flushPromises();

    await click(document.getElementById("mine"));
    expect(calls).toEqual(["first", "second"]);
    expect(getCookieYes().getSnapshot().hasActed).toBe(true);
  });

  it("composes handlers other than click the same way", async () => {
    const calls: string[] = [];
    mountWith(
      cookieOnly(),
      asChild(() => h("button", { id: "mine", onFocus: () => calls.push("child") }), {
        onFocus: () => calls.push("part"),
      }),
    );
    await flushPromises();

    document.getElementById("mine")?.dispatchEvent(new FocusEvent("focus"));
    expect(calls).toEqual(["child", "part"]);
  });

  it("puts the child's class and style last", async () => {
    mountWith(
      cookieOnly(),
      asChild(() => h("button", { id: "mine", class: "child", style: { color: "blue" } }), {
        class: "part",
        style: { color: "red", margin: "1px" },
      }),
    );
    await flushPromises();

    const el = document.getElementById("mine");
    expect(el?.classList.contains("child")).toBe(true);
    expect(el?.classList.contains("part")).toBe(true);
    expect(el?.style.color).toBe("blue");
    expect(el?.style.margin).toBe("1px");
  });

  it("keeps the child's style when the part has none", async () => {
    mountWith(
      cookieOnly(),
      asChild(() => h("button", { id: "mine", style: { color: "blue" } })),
    );
    await flushPromises();
    expect(document.getElementById("mine")?.style.color).toBe("blue");
  });
});

describe("asChild: a vnode from a compiled template", () => {
  it("keeps our aria-label following the language", async () => {
    const Comp = defineComponent({
      components: TEMPLATE_PARTS,
      template: `<BannerClose as-child><button id="mine" class="c">x</button></BannerClose>`,
    });
    mountWith(
      {
        mode: "cookie-only",
        regulation: "GDPR",
        i18n: { messages: { de: { bannerCloseLabel: "Schließen" } } },
      },
      Comp,
    );
    await flushPromises();
    expect(document.getElementById("mine")?.getAttribute("aria-label")).toBe("Close");

    await getCookieYes().setLanguage("de");
    await flushPromises();
    expect(document.getElementById("mine")?.getAttribute("aria-label")).toBe("Schließen");
  });

  it("calls a template listener once, not once per merge", async () => {
    const onClick = vi.fn();
    const Comp = defineComponent({
      components: TEMPLATE_PARTS,
      setup: () => ({ onClick }),
      template: `<BannerAcceptAll as-child><button id="mine" @click="onClick">x</button></BannerAcceptAll>`,
    });
    mountWith(cookieOnly(), Comp);
    await flushPromises();

    await click(document.getElementById("mine"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("suppresses our action for a listener written with the prevent modifier", async () => {
    const Comp = defineComponent({
      components: TEMPLATE_PARTS,
      template: `<BannerAcceptAll as-child><button id="mine" @click.prevent>x</button></BannerAcceptAll>`,
    });
    mountWith(cookieOnly(), Comp);
    await flushPromises();

    await click(document.getElementById("mine"));
    expect(getCookieYes().getSnapshot().hasActed).toBe(false);
  });
});
