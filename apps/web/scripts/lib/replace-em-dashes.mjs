// Rewrites em dashes into plain punctuation without changing what a sentence says.
//
// The docs are written by people, and people rarely type an em dash; the site should read
// that way. Each construction has an ordinary equivalent:
//
//   A — B — C        an aside          →  A, B, C
//   A — which/and…   a joined clause   →  A, which…
//   A — b            an explanation    →  A: b   (A; b when the sentence already has a colon)
//   | — |            an empty cell     →  | None |
//
// Used once, by hand, over content/shared, and on every build over the changelog bodies,
// which come from the packages' own CHANGELOG.md files and are not edited here.

const CONJUNCTION =
  /^(which|and|but|or|so|not|nor|though|although|unless|because|even|rather|just|yet|as|while|since|if|when|then|whether|where|whereas|especially|including|except|plus)\b/i;

function rewriteLine(line, { frontmatter = false } = {}) {
  if (!line.includes("—")) return line;

  // Empty table cells.
  line = line.replace(/\|\s*—\s*(?=\|)/g, "| None ");

  // Asides between two dashes on one line, never across a cell, a fence or a sentence.
  line = line.replace(/ — ((?:(?!\. )[^—|\n])*?) — /g, ", $1, ");

  // Remaining single dashes, left to right.
  let out = "";
  let rest = line;
  for (;;) {
    const idx = rest.indexOf("—");
    if (idx === -1) break;
    const left = rest.slice(0, idx).replace(/\s+$/, "");
    const right = rest.slice(idx + 1).replace(/^\s+/, "");

    let joiner;
    if (frontmatter) {
      // An unquoted YAML value must not gain a colon.
      joiner = ", ";
    } else if (CONJUNCTION.test(right)) {
      joiner = ", ";
    } else if (/[:;]\s/.test(left.slice(left.search(/[.!?]\s[^.!?]*$/) + 1))) {
      // The clause already uses a colon (or semicolon): a second one would read badly.
      joiner = "; ";
    } else if (/^[A-Z]/.test(right) && left.endsWith(":")) {
      joiner = " ";
    } else {
      joiner = ": ";
    }
    if (left.endsWith(",") || left.endsWith(";") || left.endsWith(":")) joiner = " ";
    out += left + joiner;
    rest = right;
  }
  return out + rest;
}

/** Rewrites every em dash in a Markdown/MDX document. */
export function replaceEmDashes(text) {
  const lines = text.split("\n");
  let inFrontmatter = false;
  return lines
    .map((line, i) => {
      if (i === 0 && line === "---") {
        inFrontmatter = true;
        return line;
      }
      if (inFrontmatter && line === "---") {
        inFrontmatter = false;
        return line;
      }
      return rewriteLine(line, { frontmatter: inFrontmatter });
    })
    .join("\n");
}
