import type { ConsentCategory, ScriptEntry } from "./types.js";

const registry = new Map<string, ScriptEntry>();
const loaded = new Set<string>();
const injected = new Map<string, HTMLScriptElement>();

export function registerScript(entry: ScriptEntry): void {
  registry.set(entry.id, entry);
}

export function applyScripts(categories: Record<ConsentCategory, boolean>): void {
  if (typeof document === "undefined") return;

  for (const [id, entry] of registry) {
    const allowed = categories[entry.category] === true;
    const strategy = entry.strategy ?? "afterConsent";

    if (allowed) {
      if (strategy === "lazyOnce" && loaded.has(id)) continue;
      if (!injected.has(id)) {
        injectScript(id, entry);
      }
    } else {
      removeScript(id);
    }
  }
}

function injectScript(id: string, entry: ScriptEntry): void {
  const existing = document.getElementById(id);
  if (existing) return;

  const el = document.createElement("script");
  el.id = id;
  el.src = entry.src;
  el.async = true;
  if (entry.onLoad) {
    el.addEventListener("load", entry.onLoad, { once: true });
  }
  document.head.appendChild(el);
  injected.set(id, el);
  loaded.add(id);
}

function removeScript(id: string): void {
  const el = injected.get(id);
  if (el) {
    el.remove();
    injected.delete(id);
  }
}
