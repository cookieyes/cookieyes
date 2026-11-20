import type { ConsentCategory } from "@cookieyes/core";

/** Declared locally so the guard survives as a literal; see core's `deprecations.ts`. */
declare const process: { env: { NODE_ENV?: string } };

/** The global queue core pushes to; see the note in core's `network-blocker.ts`. */
type DevQueueEntry = { k: string; t: number; d: unknown };
type DevQueueArray = DevQueueEntry[] & { v?: number };
type DevGlobal = typeof globalThis & { __COOKIEYES_DEVTOOLS__?: DevQueueArray };

/**
 * @internal Dev-only devtools instrumentation: the rendered `<iframe>` carries no marker, so
 * tell the scanner this src is managed, placeholder or not. Folds away in production; see core's
 * `network-blocker.ts`.
 */
export function _trackGatedFrame(src: () => string, category: () => ConsentCategory): void {
  if (process.env.NODE_ENV !== "production") {
    $effect(() => {
      const q = ((globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__ ??= Object.assign([], { v: 1 }));
      if (q.length >= 500) q.shift();
      q.push({
        k: "s",
        t: Date.now(),
        d: { id: src(), src: src(), category: category(), via: "GatedFrame" },
      });
    });
  }
}
