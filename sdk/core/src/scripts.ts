import type { ScriptEntry } from "./types.js";

/** Declared locally so the guard survives as a literal; see `deprecations.ts`. */
declare const process: { env: { NODE_ENV?: string } };

/** See the identical declaration + note in `network-blocker.ts`. */
type DevQueueEntry = { k: string; t: number; d: unknown };
type DevQueueArray = DevQueueEntry[] & { v?: number };
type DevGlobal = typeof globalThis & { __COOKIEYES_DEVTOOLS__?: DevQueueArray };

const registry = new Map<string, ScriptEntry>();
const injected = new Map<string, HTMLScriptElement>();

export function registerScript(entry: ScriptEntry): void {
  registry.set(entry.id, entry);
  // Dev-only devtools instrumentation: tells the scanner this src is managed,
  // since the injected `<script>` carries no marker of its own. Pushed on
  // registration, not injection, so a script still waiting for consent shows
  // as managed too. Folds away in production; see `network-blocker.ts`.
  if (process.env.NODE_ENV !== "production") {
    const q = ((globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__ ??= Object.assign([], {
      v: 1,
    }));
    if (q.length >= 500) q.shift();
    q.push({
      k: "s",
      t: Date.now(),
      d: { id: entry.id, src: entry.src, category: entry.category, via: "registerScript" },
    });
  }
}

/**
 * Inject each registered script whose category is granted. Pass the *committed*
 * consent so an unsaved toggle never loads a script. Once injected, a script
 * stays — revoking doesn't unload it (that can't undo what already ran); the
 * block takes effect on the next page load.
 */
export function applyScripts(categories: Record<string, boolean>): void {
  if (typeof document === "undefined") return;

  for (const [id, entry] of registry) {
    if (categories[entry.category] !== true) continue;
    if (injected.has(id)) continue;
    injectScript(id, entry);
  }
}

/**
 * @internal Test-only — empty the script registry and forget what was injected.
 * Mirrors {@link _clearStopHandlers}. When a `document` is present the injected
 * `<script>` elements are removed from it too, so one test can never leave a
 * gated script behind for the next one. Safe to call with nothing registered.
 */
export function _clearScriptRegistry(): void {
  if (typeof document !== "undefined") {
    for (const el of injected.values()) el.remove();
  }
  registry.clear();
  injected.clear();
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
}
