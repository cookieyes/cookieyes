// Its own module, with no imports, so an adapter that needs only this (React's
// branding link) does not pull the rest of the markup into its bundle: in the
// banner-only measurement that cost 353 bytes of gzip.

/**
 * Splits the translated "Powered by CookieYes" around the brand name, which
 * the logo shows, so the words around it are translated and the name is not
 * written twice. A translation without the brand name keeps all its text, with
 * the logo after it.
 *
 * @example splitPoweredBy("Bereitgestellt von CookieYes") // ["Bereitgestellt von", ""]
 */
export function splitPoweredBy(text: string): [before: string, after: string] {
  const at = text.indexOf("CookieYes");
  if (at === -1) return [text.trim(), ""];
  return [text.slice(0, at).trim(), text.slice(at + "CookieYes".length).trim()];
}
