import type { CookieYesConfig } from "@cookieyes/vue";
import type { InjectionKey } from "vue";

/** @internal Provides the merged config to `<CookieYesRoot />`. */
export const _CONFIG_KEY: InjectionKey<CookieYesConfig> = Symbol("cookieyes:config");

/**
 * @internal Lists the dotted paths of every function inside `value`. Used to warn when an
 * option that holds a function was put in `nuxt.config.ts`, where runtime config, which is JSON,
 * silently drops it.
 */
export function _findFunctionPaths(value: unknown, path: string): string[] {
  if (typeof value === "function") return [path];
  if (value === null || typeof value !== "object") return [];
  const found: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    found.push(
      ..._findFunctionPaths(child, Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`),
    );
  }
  return found;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * @internal Merges the `cookieyes` options from `nuxt.config.ts` (runtime config, JSON only)
 * with those from `app.config.ts` (which may hold functions). `app.config.ts` wins per key, and
 * one level of nesting is merged, so `region.map` in one file and `region.detect` in the other
 * both survive. Arrays are replaced, not concatenated.
 */
export function _mergeConfig(
  fromNuxtConfig: Partial<CookieYesConfig> | undefined,
  fromAppConfig: Partial<CookieYesConfig> | undefined,
): CookieYesConfig {
  const merged: Record<string, unknown> = { ...fromNuxtConfig };
  for (const [key, value] of Object.entries(fromAppConfig ?? {})) {
    const current = merged[key];
    merged[key] = isPlainObject(current) && isPlainObject(value) ? { ...current, ...value } : value;
  }
  return merged as CookieYesConfig;
}

const functionIds = new WeakMap<object, number>();
let nextFunctionId = 0;

function fingerprint(value: unknown): string {
  return JSON.stringify(value, (_key, child: unknown) => {
    if (typeof child !== "function") return child;
    let id = functionIds.get(child);
    if (id === undefined) {
      id = nextFunctionId++;
      functionIds.set(child, id);
    }
    return `__fn${id}`;
  });
}

let memo: { key: string; config: CookieYesConfig } | undefined;

/**
 * @internal `_mergeConfig`, returning the same object while the inputs are unchanged. The Vue
 * plugin keeps its runtime only when handed the same config object, and on the server Nuxt hands
 * every request a fresh copy of runtime and app config. Without this, each request would rebuild
 * the runtime. Functions are compared by identity, which a copy keeps.
 */
export function _resolveConfig(
  fromNuxtConfig: Partial<CookieYesConfig> | undefined,
  fromAppConfig: Partial<CookieYesConfig> | undefined,
): CookieYesConfig {
  const key = fingerprint([fromNuxtConfig, fromAppConfig]);
  if (memo?.key !== key) memo = { key, config: _mergeConfig(fromNuxtConfig, fromAppConfig) };
  return memo.config;
}
