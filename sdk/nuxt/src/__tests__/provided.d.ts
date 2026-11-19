// What test/global-setup.ts provides to the browser tests.
declare module "vitest" {
  export interface ProvidedContext {
    baseUrl: string;
    variantUrl: string;
    staticDir: string;
  }
}

export {};
