function globalScope(): Record<string, unknown> {
  return (typeof window !== "undefined" ? window : globalThis) as Record<string, unknown>;
}

/**
 * Call a method on a global vendor object only if it's present — a no-op
 * otherwise. Use it for vendors that expose an object with methods, like
 * Segment's `window.analytics`: a `"remove"` integration deletes that object on
 * withdrawal, so a plain `window.analytics.track(...)` would throw. `safeCall`
 * never throws, and — because the object is absent exactly when consent is
 * withdrawn — it also never sends anything without consent.
 *
 * (Meta's `fbq` is a function, not an object with methods, so guard it directly:
 * `window.fbq?.("track", "Purchase")`.)
 *
 * @example
 * safeCall("analytics", "track", "Signup", { plan: "pro" }); // safe before load and after revoke
 */
export function safeCall(globalName: string, method: string, ...args: unknown[]): void {
  const target = globalScope()[globalName] as Record<string, unknown> | undefined;
  const fn = target?.[method];
  if (typeof fn === "function") (fn as (...a: unknown[]) => unknown).apply(target, args);
}
