import { getCurrentInstance, inject, ssrContextKey } from "vue";

/**
 * True only while a component is being hydrated: Vue assigns `vnode.el` before running `setup`
 * during hydration and leaves it null on a normal mount and on the server.
 */
export function _isHydrating(): boolean {
  return getCurrentInstance()?.vnode.el != null;
}

/**
 * True during server rendering and during the hydrating render, when markup must equal what the
 * server sent. Not detected through `typeof document`: jsdom defines it and server tests run
 * there. The default of `null` stops `inject` warning on the client, where there is no context.
 */
export function _isServerFirst(): boolean {
  return inject(ssrContextKey, null) !== null || _isHydrating();
}
