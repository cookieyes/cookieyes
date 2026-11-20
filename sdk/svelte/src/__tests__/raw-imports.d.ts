/** Vite's `?raw` suffix returns a file's text; the tests read `package.json` that way. */
declare module "*?raw" {
  const text: string;
  export default text;
}

/** The server-rendered HTML of one banner page, made by the browser config. */
declare module "virtual:server-banner" {
  const html: string;
  export default html;
}
