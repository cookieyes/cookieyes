// Types for the virtual modules the runtime files import. They exist only inside a Nuxt app's
// build, so this package's own type check needs a declaration.
declare module "#imports" {
  export function useRuntimeConfig(): Record<string, unknown>;
  export function defineNitroPlugin(
    plugin: (nitroApp: {
      hooks: { hook(name: "render:html", fn: (html: { head: string[] }) => void): void };
    }) => void,
  ): unknown;
  export function defineEventHandler<T>(
    handler: (event: { headers: Headers }) => T,
  ): (event: { headers: Headers }) => T;
}

interface ImportMeta {
  /** Replaced by Nuxt at build time: true in the server bundle. */
  readonly server: boolean;
}
