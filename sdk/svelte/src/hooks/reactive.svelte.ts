/** A value read through `.current`, because a function cannot return a reactive primitive. */
export type Reactive<T> = { readonly current: T };

/**
 * @internal A view of an object whose every field is read from `read()` at access time, so a
 * template or `$derived` that touches `view.field` tracks whatever `read()` tracks. Destructuring
 * reads once and loses reactivity.
 */
export function _view<T extends object>(read: () => T): T {
  return new Proxy({} as T, {
    get: (_, key) => Reflect.get(read(), key),
    has: (_, key) => Reflect.has(read(), key),
    ownKeys: () => Reflect.ownKeys(read()),
    getOwnPropertyDescriptor: (_, key) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(read(), key);
      return descriptor && { ...descriptor, configurable: true };
    },
  });
}

/**
 * @internal A `{ current }` whose value is `read()`, remembered between changes. Remembering is
 * what keeps an effect that reads `.current` from re-running on every consent notification when
 * this value did not change: the dialog hooks would otherwise move focus again each time the
 * visitor toggled a category.
 */
export function _current<T>(read: () => T): Reactive<T> {
  const value = $derived.by(read);
  return {
    get current() {
      return value;
    },
  };
}
