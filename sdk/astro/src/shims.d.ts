// `import.meta.env.DEV` is replaced by Vite in every module of an Astro build, this package's
// included, which bundles it (`ssr.noExternal`). Declared here because this package does not
// depend on Vite's client types.
interface ImportMeta {
  readonly env: { readonly DEV: boolean };
}

// The components entry re-exports `.astro` files, which Astro's own types describe in a site.
declare module "*.astro" {
  const Component: (props: Record<string, unknown>) => unknown;
  export default Component;
}
