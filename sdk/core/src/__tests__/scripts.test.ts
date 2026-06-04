import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyScripts, registerScript } from "../scripts.js";
import type { ConsentCategory } from "../types.js";

function categories(overrides: Partial<Record<ConsentCategory, boolean>> = {}) {
  return {
    necessary: true,
    functional: false,
    analytics: false,
    performance: false,
    advertisement: false,
    ...overrides,
  } as Record<ConsentCategory, boolean>;
}

// Unique ids per test keep the module-level registry from colliding.
let counter = 0;
function uniqueId(): string {
  counter += 1;
  return `script-${counter}`;
}

beforeEach(() => {
  document.head.innerHTML = "";
});

describe("registerScript + applyScripts", () => {
  it("injects an allowed script into <head> with the expected attributes", () => {
    const id = uniqueId();
    registerScript({ id, src: "https://cdn.example.com/a.js", category: "analytics" });
    applyScripts(categories({ analytics: true }));

    const el = document.getElementById(id) as HTMLScriptElement | null;
    expect(el).not.toBeNull();
    expect(el?.tagName).toBe("SCRIPT");
    expect(el?.src).toBe("https://cdn.example.com/a.js");
    expect(el?.async).toBe(true);
  });

  it("does not inject when the category is denied", () => {
    const id = uniqueId();
    registerScript({ id, src: "https://cdn.example.com/b.js", category: "analytics" });
    applyScripts(categories({ analytics: false }));
    expect(document.getElementById(id)).toBeNull();
  });

  it("removes a previously-injected script when consent is revoked", () => {
    const id = uniqueId();
    registerScript({ id, src: "https://cdn.example.com/c.js", category: "advertisement" });

    applyScripts(categories({ advertisement: true }));
    expect(document.getElementById(id)).not.toBeNull();

    applyScripts(categories({ advertisement: false }));
    expect(document.getElementById(id)).toBeNull();
  });

  it("fires the onLoad callback once when the script loads", () => {
    const id = uniqueId();
    const onLoad = vi.fn();
    registerScript({ id, src: "https://cdn.example.com/d.js", category: "functional", onLoad });
    applyScripts(categories({ functional: true }));

    document.getElementById(id)?.dispatchEvent(new Event("load"));
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it("with lazyOnce strategy, does not re-inject after a revoke + re-grant", () => {
    const id = uniqueId();
    registerScript({
      id,
      src: "https://cdn.example.com/e.js",
      category: "performance",
      strategy: "lazyOnce",
    });

    applyScripts(categories({ performance: true }));
    expect(document.getElementById(id)).not.toBeNull();

    applyScripts(categories({ performance: false })); // revoked → removed
    expect(document.getElementById(id)).toBeNull();

    applyScripts(categories({ performance: true })); // lazyOnce: stays gone
    expect(document.getElementById(id)).toBeNull();
  });

  it("does not double-inject when applied twice while allowed", () => {
    const id = uniqueId();
    registerScript({ id, src: "https://cdn.example.com/f.js", category: "analytics" });
    applyScripts(categories({ analytics: true }));
    applyScripts(categories({ analytics: true }));
    expect(document.querySelectorAll(`#${id}`).length).toBe(1);
  });
});
