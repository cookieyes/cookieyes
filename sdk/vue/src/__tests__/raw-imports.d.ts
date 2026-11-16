/** Vite's `?raw` suffix returns a file's text; the tests read `package.json` that way. */
declare module "*?raw" {
  const text: string;
  export default text;
}
