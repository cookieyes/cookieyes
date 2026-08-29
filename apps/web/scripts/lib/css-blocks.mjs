// Brace-balanced top-level block splitter for a plain CSS stylesheet.
//
// Deliberately mirrors — rather than imports — `topLevelBlocks()` in
// `sdk/react/scripts/build-critical-css.mjs`: `apps/web` cannot reach into a
// sibling package's private `scripts/` directory, so this is a local
// reimplementation of the same brace-counting algorithm, not a shared module.
// See ai-context/designs/css-variables-reference.md §2.3.

/**
 * Splits `css` into brace-balanced top-level blocks. Each block is
 * `{ selector, body, text }`:
 *   - `selector` — the text before the opening `{`, comments stripped, trimmed.
 *     For an `@media (...) { ... }` block this is the full `@media (...)` text.
 *   - `body` — the raw text between the outermost `{` and its matching `}`
 *     (exclusive of the braces themselves) — for a `@media` block this is the
 *     nested rules, unparsed; call `topLevelBlocks(body)` again to recurse one
 *     level (the only nesting this stylesheet uses).
 *   - `text` — the full block, `selector { ...body... }`, verbatim.
 */
export function topLevelBlocks(css) {
  const blocks = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open === -1) break;
    let depth = 0;
    let end = -1;
    for (let j = open; j < css.length; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}" && --depth === 0) {
        end = j;
        break;
      }
    }
    if (end === -1) break;
    const selector = css
      .slice(i, open)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .trim();
    const body = css.slice(open + 1, end);
    blocks.push({ selector, body, text: `${selector} ${css.slice(open, end + 1)}` });
    i = end + 1;
  }
  return blocks;
}

/**
 * Splits a declaration block's raw body into `{ property, value }` pairs.
 * Declaration-level only — does not understand nested braces (a declaration
 * body inside a plain rule never contains one), so this must only be called
 * on the `body` of a non-`@media`, non-`@keyframes` block.
 */
export function parseDeclarations(body) {
  const declarations = [];
  for (const raw of body.split(";")) {
    const cleaned = raw.replace(/\/\*[\s\S]*?\*\//g, "").trim();
    if (!cleaned) continue;
    const colon = cleaned.indexOf(":");
    if (colon === -1) continue;
    const property = cleaned.slice(0, colon).trim();
    const value = cleaned.slice(colon + 1).trim();
    if (!property || !value) continue;
    declarations.push({ property, value });
  }
  return declarations;
}
