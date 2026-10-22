/**
 * Types for the build script, so `src/__tests__/minify-css.test.ts` can import
 * and verify the real implementation rather than a copy of it. A copy would pass
 * while the shipped transform was broken, which is the opposite of useful.
 */
export declare function minifyCss(css: string): string;
