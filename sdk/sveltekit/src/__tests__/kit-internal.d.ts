// SvelteKit ships no types for its internal server entry, which sets up the request store that
// `sequence()` reads. The handle test uses it to run under the real `sequence()`.
declare module "@sveltejs/kit/internal/server" {
  export function with_request_store<T>(store: { event: unknown; state: unknown }, fn: () => T): T;
}
