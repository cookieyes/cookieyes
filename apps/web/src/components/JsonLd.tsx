/**
 * Structured data for search engines, as a JSON-LD block.
 *
 * `<` is escaped so a value can never close the script element early. The block is data,
 * not code, so the Content-Security-Policy does not treat it as a script to allow.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify({ "@context": "https://schema.org", ...data }).replace(
    /</g,
    "\\u003c",
  );
  // biome-ignore lint/security/noDangerouslySetInnerHtml: serialised from our own static data, with "<" escaped.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
