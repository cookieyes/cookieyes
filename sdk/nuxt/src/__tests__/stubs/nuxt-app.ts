import { type Ref, ref } from "vue";

// Stands in for "nuxt/app": the few composables the runtime files use, backed by plain values the
// tests set. `useState` keeps one ref per key, as Nuxt does within a request.
export const fake = {
  runtimeConfig: { public: {} as Record<string, unknown> },
  appConfig: {} as Record<string, unknown>,
  requestHeaders: {} as Record<string, string>,
  routeRules: {} as Record<string, unknown>,
  isHydrating: false,
  states: new Map<string, Ref<unknown>>(),
};

export function resetFake(): void {
  fake.runtimeConfig = { public: {} };
  fake.appConfig = {};
  fake.requestHeaders = {};
  fake.routeRules = {};
  fake.isHydrating = false;
  fake.states.clear();
}

export function defineNuxtPlugin<T>(plugin: T): T {
  return plugin;
}

export function useNuxtApp() {
  return { isHydrating: fake.isHydrating };
}

export function useRuntimeConfig() {
  return fake.runtimeConfig;
}

export function useAppConfig() {
  return fake.appConfig;
}

export function getRouteRules(_path: string) {
  return fake.routeRules;
}

export function useRequestURL() {
  return new URL("http://localhost/");
}

export function useRequestHeaders() {
  return fake.requestHeaders;
}

export function useState<T>(key: string, init: () => T): Ref<T> {
  let state = fake.states.get(key);
  if (!state) {
    state = ref(init()) as Ref<unknown>;
    fake.states.set(key, state);
  }
  return state as Ref<T>;
}
