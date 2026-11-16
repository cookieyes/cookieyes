// Stands in for Nitro's "#imports", which exists only inside a Nuxt build.
export const runtimeConfig: Record<string, unknown> = {};

export function useRuntimeConfig(): Record<string, unknown> {
  return runtimeConfig;
}

export function defineEventHandler<T>(handler: T): T {
  return handler;
}

export function defineNitroPlugin<T>(plugin: T): T {
  return plugin;
}
