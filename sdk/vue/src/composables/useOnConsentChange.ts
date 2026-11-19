import type { ConsentEventListener, ConsentEventOptions, ConsentEventType } from "@cookieyes/core";
import { getCurrentInstance, getCurrentScope, onMounted, onScopeDispose } from "vue";
import { _useRuntime } from "./useRuntime.js";

/**
 * Run your code when consent changes. `"save"` fires on every save, `"change"` only when a
 * category actually differs. The listener also fires once on subscribing with the current state
 * (`isInitial: true`); pass `{ category }` to hear about one category.
 *
 * In a component it subscribes on mount, so it does nothing on the server, and unsubscribes when
 * the component unmounts. Outside a component but inside an effect scope it subscribes at once
 * and unsubscribes when the scope stops. `type` and `options` are read once.
 */
export function useOnConsentChange(
  type: ConsentEventType,
  listener: ConsentEventListener,
  options?: ConsentEventOptions,
): void {
  const runtime = _useRuntime("useOnConsentChange");
  const category = options?.category;
  const subscribe = () => runtime.on(type, listener, category ? { category } : undefined);

  if (getCurrentInstance()) {
    let off: (() => void) | undefined;
    onMounted(() => {
      off = subscribe();
    });
    onScopeDispose(() => off?.());
    return;
  }
  const off = subscribe();
  if (getCurrentScope()) onScopeDispose(off);
}
