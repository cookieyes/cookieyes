/**
 * The queue/stub pattern that almost every third-party tracking script uses: a
 * placeholder that remembers ("queues") calls made before the real library has
 * finished loading, so nothing is lost, and the real library catches them up
 * once it arrives. Segment (`analytics`), Meta (`fbq`) and Google (`dataLayer`)
 * all work this way.
 *
 * These helpers give a custom integration the same behaviour without
 * hand-rolling it — and because a queued call can never fail, the stub *is* the
 * safe way to send an event before consent has finished wiring the real script.
 */

type QueuedCall = [method: string, ...args: unknown[]];
/** A queue-backed stub: an array of queued calls, plus one function per method. */
export type QueueStub<M extends string = string> = QueuedCall[] & {
  [K in M]: (...args: unknown[]) => unknown;
};

function globalScope(): Record<string, unknown> {
  return (typeof window !== "undefined" ? window : globalThis) as Record<string, unknown>;
}

/**
 * Create (once) a queue-backed global stub. Each method queues `[method, …args]`
 * on the array; a later {@link flushQueue} (or the vendor's own library) replays
 * them. Returns the existing stub if one is already present.
 *
 * @example
 * const analytics = createQueue("analytics", ["track", "identify", "page"]);
 * analytics.track("Signup"); // queued now, delivered once the script loads
 */
export function createQueue<M extends string>(globalName: string, methods: M[]): QueueStub<M> {
  const scope = globalScope();
  const existing = scope[globalName] as QueueStub<M> | undefined;
  if (existing) return existing;

  const stub = [] as unknown as QueueStub<M>;
  for (const method of methods) {
    (stub as Record<string, unknown>)[method] = (...args: unknown[]) => {
      stub.push([method, ...args]);
      return stub;
    };
  }
  scope[globalName] = stub;
  return stub;
}

/**
 * Catch a stub up once the real script is ready: replay every queued call
 * through `handle`, and rewire the stub's methods so later calls reach `handle`
 * directly. Call this from your integration when its real library has loaded.
 *
 * @example
 * flushQueue("analytics", (method, ...args) => realAnalytics[method](...args));
 */
export function flushQueue(
  globalName: string,
  handle: (method: string, ...args: unknown[]) => void,
): void {
  const stub = globalScope()[globalName] as QueueStub | undefined;
  if (!stub) return;

  const queued = stub.splice(0, stub.length) as QueuedCall[];
  for (const key of Object.keys(stub)) {
    if (typeof stub[key] === "function") {
      stub[key] = (...args: unknown[]) => handle(key, ...args);
    }
  }
  for (const [method, ...args] of queued) handle(method, ...args);
}
