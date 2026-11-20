import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _createRuntime, getCookieYes } from "../runtime.js";
import RenderCount from "./fixtures/RenderCount.svelte";
import { clearCookie, cookieOnly, mountWith, settle, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useSnapshot (through useConsent)", () => {
  it("reads live at once on a plain client mount, without a second render", async () => {
    const renders: string[] = [];
    mountWith(cookieOnly(), RenderCount, { renders });
    getCookieYes().manager.acceptAll();
    await settle();
    expect(renders).toEqual(["false", "true"]);
  });

  it("subscribes to the runtime while a template reads it and lets go when it is destroyed", async () => {
    const config = cookieOnly();
    const runtime = _createRuntime(config);
    let active = 0;
    const subscribe = runtime.subscribe;
    vi.spyOn(runtime, "subscribe").mockImplementation((listener) => {
      active += 1;
      const off = subscribe(listener);
      return () => {
        active -= 1;
        off();
      };
    });
    const view = mountWith(config, RenderCount, { renders: [] });
    await settle();
    expect(active).toBe(1);
    view.unmount();
    await settle();
    expect(active).toBe(0);
  });

  it("does not subscribe when nothing reads the value", async () => {
    const config = cookieOnly();
    const runtime = _createRuntime(config);
    const spy = vi.spyOn(runtime, "subscribe");
    mountWith(config);
    await settle();
    expect(spy).not.toHaveBeenCalled();
  });
});
