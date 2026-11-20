import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GatedScript from "../controls/GatedScript.svelte";
import { getCookieYes } from "../runtime.js";
import { clearCookie, cookieOnly, mountWith, settle, unmountAll } from "./test-utils.js";

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
  const view = mountWith(cookieOnly("GDPR"), GatedScript, props);
  if (grant) getCookieYes().manager.acceptAll();
  return view;
}

describe("GatedScript", () => {
  it("renders nothing to the DOM tree", async () => {
    const view = mountScript({
      id: uniqueScriptId(),
      src: "https://cdn.example.com/x.js",
      category: "analytics",
    });
    await settle();
    expect(view.container.textContent).toBe("");
    expect(view.container.querySelector("*")).toBeNull();
  });

  it("does not inject the script while its category is denied", async () => {
    const id = uniqueScriptId();
    mountScript({ id, src: "https://cdn.example.com/y.js", category: "analytics" });
    await settle();
    expect(document.getElementById(id)).toBeNull();
  });

  it("injects the script once its category is consented", async () => {
    const id = uniqueScriptId();
    mountScript({ id, src: "https://cdn.example.com/z.js", category: "analytics" });
    getCookieYes().manager.acceptAll();
    await settle();
    const el = document.getElementById(id) as HTMLScriptElement | null;
    expect(el).not.toBeNull();
    expect(el?.src).toBe("https://cdn.example.com/z.js");
  });

  it("forwards the onLoad callback to the registry", async () => {
    const id = uniqueScriptId();
    const onLoad = vi.fn();
    mountScript({ id, src: "https://cdn.example.com/w.js", category: "analytics", onLoad });
    getCookieYes().manager.acceptAll();
    await settle();
    document.getElementById(id)?.dispatchEvent(new Event("load"));
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it("registers the script again when its category changes", async () => {
    const id = uniqueScriptId();
    const view = mountWith(cookieOnly("GDPR"), GatedScript, {
      id,
      src: "https://cdn.example.com/v.js",
      category: "analytics",
    });
    const register = vi.spyOn(getCookieYes(), "registerScript");
    await view.rerender({
      componentProps: { id, src: "https://cdn.example.com/v.js", category: "marketing" },
    });
    await settle();
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ id, category: "marketing" }));
  });
});
