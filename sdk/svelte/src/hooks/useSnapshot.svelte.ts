import { createSubscriber } from "svelte/reactivity";
import type { ProviderContext } from "../keys.js";
import type { CookieYesSnapshot } from "../runtime.js";
import { _useContext } from "./useRuntime.js";
import { _useServerSnapshot } from "./useServerSnapshot.svelte.js";

/**
 * @internal A function that reads the runtime and re-runs its reader whenever core notifies.
 * `createSubscriber` subscribes only while an effect or template reads the value, and does
 * nothing on the server, which is the job `useSyncExternalStore` does in React.
 */
export function _subscribeTo(context: ProviderContext): () => void {
  return createSubscriber((update) => context.runtime.subscribe(update));
}

/**
 * @internal The snapshot every state hook selects from. Server and hydrating renders read the
 * server snapshot, then the live one once the provider has mounted. A plain client mount reads
 * the live one at once, so nothing is rendered and removed again.
 */
export function _useSnapshot(name: string): () => CookieYesSnapshot {
  const context = _useContext(name);
  const subscribe = _subscribeTo(context);
  const server = _useServerSnapshot(context);
  return () => {
    if (!context.live()) return server();
    subscribe();
    return context.runtime.getSnapshot();
  };
}
