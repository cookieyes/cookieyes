import type { ConsentEventListener, ConsentEventOptions, ConsentEventType } from "@cookieyes/core";
import { onMount } from "svelte";
import { _useRuntime } from "./useRuntime.js";

/**
 * Run your code when consent changes. `"save"` fires on every save, `"change"` only when a
 * category actually differs. The listener also fires once on subscribing with the current state
 * (`isInitial: true`); pass `{ category }` to hear about one category.
 *
 * It subscribes on mount, so it does nothing on the server, and unsubscribes when the component
 * is destroyed. `type`, `listener` and `options` are read once.
 */
export function useOnConsentChange(
  type: ConsentEventType,
  listener: ConsentEventListener,
  options?: ConsentEventOptions,
): void {
  const runtime = _useRuntime("useOnConsentChange");
  const category = options?.category;
  onMount(() => runtime.on(type, listener, category ? { category } : undefined));
}
