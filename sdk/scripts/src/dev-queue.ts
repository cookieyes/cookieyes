/** Declared locally so the guard survives as a literal; see core's `deprecations.ts`. */
declare const process: { env: { NODE_ENV?: string } };

/** The same global queue core pushes to; see the note in core's `network-blocker.ts`. */
type DevQueueEntry = { k: string; t: number; d: unknown };
type DevQueueArray = DevQueueEntry[] & { v?: number };
type DevGlobal = typeof globalThis & { __COOKIEYES_DEVTOOLS__?: DevQueueArray };

/**
 * Dev-only: tell `@cookieyes/devtools`' scanner that a `<script>` this package
 * injected is managed, since the element carries no marker of its own. The
 * guard is inside the function so every call site stays one line; in
 * production the body folds away and a minifier drops the empty call. This
 * package has no size budget, so the leftover call is not worth a guard at
 * each of the seven sites.
 */
export function devTrackScript(el: HTMLScriptElement, category?: string | string[]): void {
  if (process.env.NODE_ENV !== "production") {
    const q = ((globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__ ??= Object.assign([], {
      v: 1,
    }));
    if (q.length >= 500) q.shift();
    q.push({
      k: "s",
      t: Date.now(),
      d: { id: el.id, src: el.src, category, via: "integration" },
    });
  }
}
