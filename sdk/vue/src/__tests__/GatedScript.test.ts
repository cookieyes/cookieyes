import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, shallowRef } from "vue";
import { GatedScript } from "../controls/GatedScript.js";
import { getCookieYes } from "../runtime.js";
import { clearCookie, cookieOnly, mountWith, unmountAll } from "./test-utils.js";

let scriptSeq = 0;
/** Unique id helper: the core script registry is global. */
function uniqueScriptId(): string {
  scriptSeq += 1;
  return `gated-script-${scriptSeq}`;
}

beforeEach(() => {
  clearCookie();
  document.head.innerHTML = "";
});
afterEach(unmountAll);

function mountScript(props: Record<string, unknown>, grant = false) {
  const wrapper = mountWith(
    cookieOnly("GDPR"),
    defineComponent({ render: () => h(GatedScript, props as never) }),
  );
  if (grant) getCookieYes().manager.acceptAll();
  return wrapper;
}

describe("GatedScript", () => {
  it("renders nothing to the DOM tree", async () => {
    const wrapper = mountScript({
      id: uniqueScriptId(),
      src: "https://cdn.example.com/x.js",
      category: "analytics",
    });
    await flushPromises();
    expect(wrapper.element.nodeType).toBe(Node.COMMENT_NODE);
  });

  it("does not inject the script while its category is denied", async () => {
    const id = uniqueScriptId();
    mountScript({ id, src: "https://cdn.example.com/y.js", category: "analytics" });
    await flushPromises();
    expect(document.getElementById(id)).toBeNull();
  });

  it("injects the script once its category is consented", async () => {
    const id = uniqueScriptId();
    mountScript({ id, src: "https://cdn.example.com/z.js", category: "analytics" });
    getCookieYes().manager.acceptAll();
    await flushPromises();
    const el = document.getElementById(id) as HTMLScriptElement | null;
    expect(el).not.toBeNull();
    expect(el?.src).toBe("https://cdn.example.com/z.js");
  });

  it("forwards the onLoad callback to the registry", async () => {
    const id = uniqueScriptId();
    const onLoad = vi.fn();
    mountScript({ id, src: "https://cdn.example.com/w.js", category: "analytics", onLoad });
    getCookieYes().manager.acceptAll();
    await flushPromises();
    document.getElementById(id)?.dispatchEvent(new Event("load"));
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it("registers the script again when its category changes", async () => {
    const id = uniqueScriptId();
    const category = shallowRef("analytics");
    mountWith(
      cookieOnly("GDPR"),
      defineComponent({
        render: () =>
          h(GatedScript, { id, src: "https://cdn.example.com/v.js", category: category.value }),
      }),
    );
    const register = vi.spyOn(getCookieYes(), "registerScript");
    category.value = "marketing";
    await flushPromises();
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ id, category: "marketing" }));
  });
});
