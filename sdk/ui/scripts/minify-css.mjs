/**
 * Minifies the stylesheets into `dist/`.
 *
 * The source sheets are heavily commented on purpose — several rules encode
 * non-obvious reasoning (why the theme tokens have defaults, why the entry
 * animation is opacity-only, why a re-parented banner must not re-animate) and
 * that context belongs next to the CSS. But the build used to `cp` the sheet
 * verbatim, so every consumer downloaded those comments. Stripping them is worth
 * ~1.5 KB gzipped on `styles.css` alone.
 *
 * Deliberately dependency-free rather than reaching for a CSS minifier: the
 * transform is comment removal plus whitespace collapsing, it is verified by
 * `src/__tests__/minify-css.test.ts`, and the JS bundle already has terser. Adding
 * a whole CSS toolchain to save a few more bytes is not a good trade.
 *
 * It is conservative on purpose — no value shortening, no rule merging, no
 * reordering — so it cannot change what the CSS means.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "src", "styles");
const DIST = join(HERE, "..", "dist");

/**
 * Strip comments and collapse insignificant whitespace.
 *
 * Exported for the test. Note the ordering: comments go first, then whitespace,
 * so a comment sitting between two declarations cannot fuse them together.
 */
export function minifyCss(css) {
  const out = css
    // Comments. The source contains no `/*` inside a string or url(), so a
    // plain non-greedy match is safe here; the test guards that assumption by
    // checking the output still parses and keeps every declaration.
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    // Space around structural punctuation carries no meaning.
    .replace(/\s*([{};,>])\s*/g, "$1")
    // `:` is only safe to tighten inside a declaration, not in a selector like
    // `a:hover` or `:where(...)` — but those never have space after the colon
    // in the source, so only collapse "space before colon".
    .replace(/\s+:/g, ":")
    .replace(/;}/g, "}")
    .trim();
  return `${out}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const name of ["cookieyes.css", "critical.css"]) {
    const out = name === "cookieyes.css" ? "styles.css" : name;
    const src = readFileSync(join(SRC, name), "utf8");
    const min = minifyCss(src);
    writeFileSync(join(DIST, out), min);
    const pct = (((src.length - min.length) / src.length) * 100).toFixed(0);
    console.log(
      `minify-css: ${name} -> dist/${out}  ${src.length} -> ${min.length} bytes (-${pct}%)`,
    );
  }
}
