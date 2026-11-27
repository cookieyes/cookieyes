/** @internal What the middleware writes into every page's head, decided once at config time. */
export type _HeadParts = {
  /** Inline script bodies, in order: the Consent Mode default when asked for, then the pre-paint script. */
  scripts: string[];
  /** Inline style bodies: the critical CSS, then the wait rule. */
  styles: string[];
  /** The full stylesheet's URL, with the base path and the cache-busting query. */
  href: string;
};

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * @internal The head tags. A nonce is written only when the page has one for that directive;
 * without one the tags are admitted by the hashes the integration registers or prints. The full
 * stylesheet is fetched without blocking first paint, and the runtime switches it to
 * `media="all"` once mounted.
 */
export function _headMarkup(
  parts: _HeadParts,
  nonces: { script?: string | undefined; style?: string | undefined },
): string {
  const scriptNonce = nonces.script ? ` nonce="${escapeAttribute(nonces.script)}"` : "";
  const styleNonce = nonces.style ? ` nonce="${escapeAttribute(nonces.style)}"` : "";
  return (
    parts.scripts.map((s) => `<script${scriptNonce}>${s}</script>`).join("") +
    parts.styles.map((s) => `<style${styleNonce}>${s}</style>`).join("") +
    `<link rel="stylesheet" href="${escapeAttribute(parts.href)}" media="print" data-cy-full${styleNonce}>`
  );
}

/**
 * @internal The nonce a response's Content-Security-Policy already allows for the head tags, read
 * from a `'nonce-…'` source, so they run under the policy the site's own middleware set: the
 * SvelteKit adapter's "copy the nonce already there" rule. The directive is the one the browser
 * applies to a `<script>` or `<style>` element: `*-src-elem`, else `*-src`, else `default-src`.
 */
export function _readNonce(policy: string | null, kind: "script" | "style"): string | undefined {
  if (!policy) return undefined;
  const directives = new Map<string, string[]>();
  for (const part of policy.split(";")) {
    const [name, ...sources] = part.trim().split(/\s+/);
    // The first occurrence of a directive is the one a browser enforces.
    if (name && !directives.has(name.toLowerCase())) directives.set(name.toLowerCase(), sources);
  }
  const sources =
    directives.get(`${kind}-src-elem`) ??
    directives.get(`${kind}-src`) ??
    directives.get("default-src") ??
    [];
  for (const source of sources) {
    const match = /^'nonce-([^']+)'$/.exec(source);
    if (match) return match[1];
  }
  return undefined;
}

const CHARSET = /<meta charset[^>]*>/i;
const HEAD_OPEN = /<head(?:\s[^>]*)?>/i;
const HEAD_DONE = /<\/head>|<body[\s>]/i;

/**
 * @internal Puts `markup` right after the page's `<meta charset>`, ahead of every other tag so the
 * Consent Mode default runs before any Google tag. Not before the charset: about 7 KB of critical
 * CSS would push it past the first 1024 bytes, where a browser stops looking for it, and a static
 * host that sends no charset header would then decode the banner's translations wrongly. Without
 * a charset tag it goes after `<head>`.
 *
 * Returns undefined while `final` is false and `html` may still be followed by a charset tag, so a
 * stream keeps reading. A response with neither anchor, such as a server island's partial HTML,
 * comes back unchanged, never with the markup prepended.
 */
export function _insertHead(html: string, markup: string, final: boolean): string | undefined {
  let match = CHARSET.exec(html);
  if (!match) {
    if (!final && !HEAD_DONE.test(html)) return undefined;
    match = HEAD_OPEN.exec(html);
    if (!match) return html;
  }
  const end = match.index + match[0].length;
  return html.slice(0, end) + markup + html.slice(end);
}

/**
 * @internal Streams `body` through {@link _insertHead}: it holds back only the start of the page,
 * until the charset tag or the end of the head arrives, and passes the rest through as it comes,
 * so a streamed page still reaches the browser in pieces.
 */
export function _insertHeadStream(
  body: ReadableStream<Uint8Array>,
  markup: string,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let pending = "";
  let placed = false;
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        // Decoded even after the insertion, so a character split across two chunks is never cut.
        const text = decoder.decode(chunk, { stream: true });
        if (placed) {
          if (text) controller.enqueue(encoder.encode(text));
          return;
        }
        pending += text;
        const out = _insertHead(pending, markup, false);
        if (out === undefined) return;
        placed = true;
        pending = "";
        controller.enqueue(encoder.encode(out));
      },
      flush(controller) {
        const rest = pending + decoder.decode();
        const out = placed ? rest : (_insertHead(rest, markup, true) as string);
        if (out) controller.enqueue(encoder.encode(out));
      },
    }),
  );
}
