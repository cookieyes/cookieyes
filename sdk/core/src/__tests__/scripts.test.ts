import { beforeEach, describe, expect, it, vi } from "vitest";
import { _clearScriptRegistry, applyScripts, registerScript } from "../scripts.js";
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

  it("keeps an injected script after revoke — re-blocking applies on the next load, not live", () => {
    const id = uniqueId();
    registerScript({ id, src: "https://cdn.example.com/c.js", category: "advertisement" });

    applyScripts(categories({ advertisement: true }));
    expect(document.getElementById(id)).not.toBeNull();

    // Revoking does NOT tear a running script out of the DOM (that wouldn't undo
    // what it already did); the block takes effect on the next page load.
    applyScripts(categories({ advertisement: false }));
    expect(document.getElementById(id)).not.toBeNull();
  });

  it("does not inject a script whose category was never committed-granted", () => {
    const id = uniqueId();
    registerScript({ id, src: "https://cdn.example.com/c2.js", category: "advertisement" });
    // Simulates a fresh load where the category is denied — the script that ran
    // in a *previous* session is gone (fresh DOM) and is not re-injected.
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

  it("injects a script only once and keeps it across a revoke + re-grant (no reload)", () => {
    const id = uniqueId();
    registerScript({
      id,
      src: "https://cdn.example.com/e.js",
      category: "performance",
    });

    applyScripts(categories({ performance: true }));
    expect(document.getElementById(id)).not.toBeNull();

    applyScripts(categories({ performance: false })); // revoke doesn't remove it
    expect(document.getElementById(id)).not.toBeNull();

    applyScripts(categories({ performance: true })); // re-grant doesn't duplicate it
    expect(document.querySelectorAll(`#${id}`)).toHaveLength(1);
  });

  it("does not double-inject when applied twice while allowed", () => {
    const id = uniqueId();
    registerScript({ id, src: "https://cdn.example.com/f.js", category: "analytics" });
    applyScripts(categories({ analytics: true }));
    applyScripts(categories({ analytics: true }));
    expect(document.querySelectorAll(`#${id}`).length).toBe(1);
  });
});

// Declared last on purpose: this suite empties the module-level registry the
// suites above share, so it must not run before them.
describe("_clearScriptRegistry", () => {
  it("removes injected elements and forgets the registration", () => {
    const id = uniqueId();
    registerScript({ id, src: "https://cdn.example.com/g.js", category: "analytics" });
    applyScripts(categories({ analytics: true }));
    expect(document.getElementById(id)).not.toBeNull();

    _clearScriptRegistry();
    expect(document.getElementById(id)).toBeNull();

    // Forgotten, so a later apply must not resurrect it.
    applyScripts(categories({ analytics: true }));
    expect(document.getElementById(id)).toBeNull();
  });

  it("lets the same id be registered again afterwards", () => {
    const id = uniqueId();
    registerScript({ id, src: "https://cdn.example.com/h.js", category: "functional" });
    applyScripts(categories({ functional: true }));
    _clearScriptRegistry();

    registerScript({ id, src: "https://cdn.example.com/h2.js", category: "functional" });
    applyScripts(categories({ functional: true }));
    const el = document.getElementById(id) as HTMLScriptElement | null;
    expect(el?.src).toBe("https://cdn.example.com/h2.js");
  });

  it("is a safe no-op with nothing registered", () => {
    _clearScriptRegistry();
    expect(() => _clearScriptRegistry()).not.toThrow();
  });

  it("does not throw when there is no document", () => {
    registerScript({ id: uniqueId(), src: "https://cdn.example.com/i.js", category: "analytics" });
    vi.stubGlobal("document", undefined);
    try {
      expect(() => _clearScriptRegistry()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
