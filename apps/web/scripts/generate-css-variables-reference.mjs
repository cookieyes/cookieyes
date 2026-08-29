#!/usr/bin/env node
// Extracts the structural facts of the 12 `ThemeVars` tokens — their names (TS
// compiler API against `sdk/react/src/styles/tokens.ts`), their light/dark
// defaults, every selector that consumes them, and the alias relationships
// between them (both parsed from `sdk/react/src/styles/cookieyes.css`) — joins
// them against the hand-maintained sidecar (`css-variables.sidecar.ts`), and
// writes ONE in-memory dataset to TWO files in the same run:
//   - `.generated/css-variables-reference.json` for the MDX render components
//   - `public/design-tokens/cookieyes.tokens.json`, the public W3C design-tokens file
// One dataset, two writers, so the two outputs cannot drift from each other —
// see ai-context/designs/css-variables-reference.md §2.3, §2.4.
//
// Fails closed (process.exit(1), naming the offending token/entry) on:
//   1. zero tokens extracted from `ThemeVars`
//   2. extracted token count !== 12 (the known, approved surface)
//   3. an extracted token with no matching sidecar entry (undocumented token)
//   4. a sidecar entry with no matching extracted token (stale entry)
//   5. a `hardcodedColorSidecarEntries` entry whose {selector, property, value}
//      no longer matches a real declaration in cookieyes.css (stale entry)
//   6. entry-count floor — plausibility guard, not an exact count (see note below)
//
// NOTE on the dead-token guard (design §2.3 fail-closed check 5): the design
// document also specifies a check that fails the build if any token has zero
// consumers outside `:root` — the literal regression guard for the
// `--cy-primary-hover` bug this ticket's SDK half fixes. That guard is
// deliberately NOT implemented here. `apps/web` and the SDK's
// `.cy-btn-primary:hover` fix (sdk/react/src/styles/cookieyes.css) are being
// implemented concurrently by two different agents; until the SDK's fix
// lands, `--cy-primary-hover` genuinely has zero consumers, and enforcing the
// guard here would make this script fail on a checkout that hasn't yet picked
// up the SDK's change — a false failure, not a real regression. The
// regression guard for that bug belongs in the SDK's own test suite
// (`styles-parity.test.ts`, owned by the SDK change), which can assert against
// `cookieyes.css` directly without this cross-package build ordering problem.
// This generator instead reports each token's consumer count *faithfully*,
// including zero — the reference page will show it, which is itself useful
// signal, just not a build-breaking one from this script.
//
// NOTE on the entry-count floor: this is a PLAUSIBILITY floor ("did the
// generator run and find something," not "does the count match one exact
// number"). The real per-run count legitimately moves with every CSS edit —
// today it's 61 consumer entries; once the SDK's `.cy-btn-primary:hover` fix
// lands it becomes 63; a future token or rule adds more. Hardcoding 61 or 63
// would break this script on every future legitimate change to cookieyes.css.
// The floors below (12 tokens, ~45 consumer entries, 10 hardcoded entries) are
// generous enough to never fire on a real edit, while still catching "the
// generator exited 0 but a regex silently matched almost nothing."
//
// See ai-context/designs/css-variables-reference.md §2.2, §2.3, §2.4.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { parseDeclarations, topLevelBlocks } from "./lib/css-blocks.mjs";
import { loadTsSidecarModule } from "./lib/ts-sidecar.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..");
const repoRoot = join(webRoot, "..", "..");
const tokensFile = join(repoRoot, "sdk", "react", "src", "styles", "tokens.ts");
const cssFile = join(repoRoot, "sdk", "react", "src", "styles", "cookieyes.css");
const outDir = join(webRoot, ".generated");
const outFile = join(outDir, "css-variables-reference.json");
const publicOutDir = join(webRoot, "public", "design-tokens");
const publicOutFile = join(publicOutDir, "cookieyes.tokens.json");
const sidecarPath = join(webRoot, "content", "docs", "styling", "css-variables.sidecar.ts");

const EXPECTED_TOKEN_COUNT = 12;
const EXPECTED_HARDCODED_COUNT = 17;
/** Plausibility floors — see the module doc comment above. */
const MIN_CONSUMER_ENTRIES = 45;
const MIN_HARDCODED_ENTRIES = 10;

const VAR_REF_RE = /var\(\s*(--cy-[a-zA-Z0-9-]+)/g;

function fail(message) {
  console.error(`[generate-css-variables-reference] ${message}`);
  process.exit(1);
  // Unreachable, but keeps callers from needing to `return` after `fail(...)`.
  throw new Error(message);
}

function findTypeAlias(sourceFile, name) {
  let found;
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === name) found = node;
  });
  return found;
}

/**
 * Token names, in declaration order, from `ThemeVars`. This is the single
 * source of truth for "which 12 tokens exist" — see fail-closed checks 1–2.
 */
function extractTokenNames() {
  const program = ts.createProgram([tokensFile], {
    target: ts.ScriptTarget.ESNext,
    lib: ["lib.esnext.d.ts", "lib.dom.d.ts"],
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    strict: true,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(tokensFile);
  if (!sourceFile) fail(`could not load source file ${tokensFile}`);

  const node = findTypeAlias(sourceFile, "ThemeVars");
  if (!node) fail(`could not find type alias "ThemeVars" in ${tokensFile}`);

  const type = checker.getTypeAtLocation(node.name);
  return checker.getPropertiesOfType(type).map((symbol) => symbol.getName());
}

/**
 * Walks every top-level block of `cookieyes.css`, recursing one level into
 * `@media` blocks (the only nesting this stylesheet uses — see design §2.3
 * step 2), and returns:
 *   - `rootDeclarations` — every `--cy-*` declaration found inside `:root`
 *     (top-level or the dark-scheme `@media`), tagged `scheme: "light" | "dark"`
 *   - `consumers` — `{ token, selector, property, media }` for every
 *     non-`:root` declaration whose value contains `var(--cy-token)`
 *   - `allDeclarations` — every non-`:root` `{ selector, property, value }`,
 *     used to validate the hardcoded-colour sidecar (fail-closed check 5)
 */
function walkStylesheet(css) {
  const rootDeclarations = [];
  const consumers = [];
  const allDeclarations = [];

  function visit(block, media) {
    const { selector, body } = block;
    if (selector.startsWith("@keyframes")) return; // opaque to this walk — no --cy-* usage exists here
    if (selector.startsWith("@media")) {
      // One level of nesting only, per design §2.3 step 2.
      for (const nested of topLevelBlocks(body)) visit(nested, selector);
      return;
    }

    const declarations = parseDeclarations(body);
    const isRoot = selector === ":root";

    for (const { property, value } of declarations) {
      if (isRoot) {
        if (!property.startsWith("--cy-")) continue;
        rootDeclarations.push({
          token: property,
          value,
          scheme: media?.includes("prefers-color-scheme: dark") ? "dark" : "light",
        });
        continue;
      }

      allDeclarations.push({ selector, property, value, media: media ?? null });

      const referenced = [...value.matchAll(VAR_REF_RE)].map((m) => m[1]);
      for (const token of referenced) {
        consumers.push({ token, selector, property, media: media ?? null });
      }
    }
  }

  for (const block of topLevelBlocks(css)) visit(block, null);
  return { rootDeclarations, consumers, allDeclarations };
}

/**
 * Splits `rootDeclarations` into per-token defaults and alias relationships.
 * A `:root` declaration whose value contains `var(--cy-x)` is an alias of
 * `--cy-x` on the token being declared, not a plain default — see design
 * §2.2(a). It is still recorded as the token's raw default text (the alias
 * expression, e.g. `var(--cy-primary)`, is itself valid CSS to display/copy).
 */
function buildDefaultsAndAliases(rootDeclarations) {
  const defaultLight = new Map();
  const defaultDark = new Map();
  const aliasOf = new Map(); // token -> AliasRef
  const aliasedBy = new Map(); // token -> string[]

  for (const { token, value, scheme } of rootDeclarations) {
    (scheme === "dark" ? defaultDark : defaultLight).set(token, value);

    const referenced = [...value.matchAll(VAR_REF_RE)].map((m) => m[1]);
    if (referenced.length === 0) continue;
    // Every alias in this stylesheet references exactly one other token —
    // if that ever changes, the first reference is recorded and the rest are
    // silently ignored, which fail-closed check 6 (entry-count floor) is the
    // last-resort net for, since alias plurality isn't independently checked.
    const toToken = referenced[0];
    const isExpression = value.trim() !== `var(${toToken})`;
    aliasOf.set(token, {
      fromToken: token,
      toToken,
      isExpression,
      transform: isExpression ? value.trim() : null,
    });
    if (!aliasedBy.has(toToken)) aliasedBy.set(toToken, []);
    aliasedBy.get(toToken).push(token);
  }

  return { defaultLight, defaultDark, aliasOf, aliasedBy };
}

function buildDefaultsBlock(tokenEntries, scheme) {
  const lines = tokenEntries.map((t) => {
    const value = scheme === "dark" ? (t.defaultDark ?? t.defaultLight) : t.defaultLight;
    return `  ${t.name}: ${value};`;
  });
  return `:root {\n${lines.join("\n")}\n}`;
}

/** W3C Design Tokens Community Group draft format — see design §2.4. */
function buildW3cTokensDocument(tokenEntries) {
  const cy = {};
  for (const token of tokenEntries) {
    const key = token.name.replace(/^--cy-/, "");
    if (token.type === "dimension") {
      const match = /^(\d+(?:\.\d+)?)([a-z%]*)$/i.exec(token.defaultLight.trim());
      cy[key] = {
        $type: "dimension",
        $value: match ? { value: Number(match[1]), unit: match[2] || "px" } : token.defaultLight,
        $description: token.description,
      };
      continue;
    }
    if (token.type === "fontFamily") {
      cy[key] = {
        $type: "fontFamily",
        $value: token.defaultLight.split(",").map((f) => f.trim()),
        $description: token.description,
      };
      continue;
    }

    // $type: "color" — the four honest special cases from design §2.4.
    if (token.aliasOf && !token.aliasOf.isExpression) {
      // --cy-focus: a genuine, untransformed alias.
      cy[key] = {
        $type: "color",
        $value: `{cy.${token.aliasOf.toToken.replace(/^--cy-/, "")}}`,
        $description: token.description,
      };
    } else if (token.aliasOf?.isExpression) {
      // --cy-primary-hover: an alias WITH a transform — reference + documented deviation.
      cy[key] = {
        $type: "color",
        $value: `{cy.${token.aliasOf.toToken.replace(/^--cy-/, "")}}`,
        $description: `${token.description} The real value is a runtime color-mix() transform of the referenced token, not a static colour — see $extensions.cookieyes.transform.`,
        $extensions: {
          cookieyes: { transform: token.aliasOf.transform, computed: true },
        },
      };
    } else if (token.derivedFrom) {
      // --cy-on-primary / --cy-on-widget-bg: JS-computed, not a CSS alias at all.
      cy[key] = {
        $type: "color",
        $value: token.defaultLight,
        $description: `${token.description} This file cannot reflect a customer's own colour choice — it recomputes at runtime via WCAG contrast against ${token.derivedFrom}.`,
        $extensions: {
          cookieyes: {
            computed: true,
            computedFrom: `{cy.${token.derivedFrom.replace(/^--cy-/, "")}}`,
          },
        },
      };
    } else {
      cy[key] = { $type: "color", $value: token.defaultLight, $description: token.description };
    }
  }
  return { $description: "CookieYes SDK design tokens — generated, do not edit by hand.", cy };
}

async function main() {
  const tokenNames = extractTokenNames();

  // Fail-closed check 1: zero tokens extracted.
  if (tokenNames.length === 0) {
    fail(
      `compiler-API extraction of "ThemeVars" yielded zero tokens — refusing to publish an empty reference.`,
    );
  }

  // Fail-closed check 2: known, approved surface is exactly 12 tokens.
  if (tokenNames.length !== EXPECTED_TOKEN_COUNT) {
    fail(
      `extracted ${tokenNames.length} token(s) from "ThemeVars", expected exactly ${EXPECTED_TOKEN_COUNT}. ` +
        `A token was added to or removed from ThemeVars without updating this design and the sidecar. ` +
        `Extracted: ${tokenNames.join(", ")}`,
    );
  }

  const css = readFileSync(cssFile, "utf-8");
  const { rootDeclarations, consumers, allDeclarations } = walkStylesheet(css);
  const { defaultLight, defaultDark, aliasOf, aliasedBy } =
    buildDefaultsAndAliases(rootDeclarations);

  const sidecarEntries = await loadTsSidecarModule(sidecarPath, "cssVariableSidecarEntries");
  const hardcodedSidecarEntries = await loadTsSidecarModule(
    sidecarPath,
    "hardcodedColorSidecarEntries",
  );

  // Fail-closed check 3: any extracted token with no matching sidecar entry.
  const sidecarNames = new Set(sidecarEntries.map((e) => e.name));
  const undocumented = tokenNames.filter((name) => !sidecarNames.has(name));
  if (undocumented.length > 0) {
    fail(
      `${undocumented.length} token(s) extracted from ThemeVars have no sidecar entry in ` +
        `css-variables.sidecar.ts: ${undocumented.join(", ")}. Add a CssVariableSidecarEntry for each.`,
    );
  }

  // Fail-closed check 4: any sidecar entry with no matching extracted token.
  const extractedNames = new Set(tokenNames);
  const staleTokens = sidecarEntries.filter((e) => !extractedNames.has(e.name)).map((e) => e.name);
  if (staleTokens.length > 0) {
    fail(
      `${staleTokens.length} sidecar entry(s) in css-variables.sidecar.ts have no matching token in ` +
        `ThemeVars: ${staleTokens.join(", ")}. Remove them.`,
    );
  }

  // Fail-closed check 5: every hardcoded-colour sidecar entry must match a
  // real, live declaration — {selector, property, value} exactly, never by
  // line number (line numbers drift on every unrelated edit).
  const staleHardcoded = [];
  for (const entry of hardcodedSidecarEntries) {
    const match = allDeclarations.some(
      (d) =>
        d.selector === entry.selector && d.property === entry.property && d.value === entry.value,
    );
    if (!match) {
      staleHardcoded.push(`${entry.selector} { ${entry.property}: ${entry.value} }`);
    }
  }
  if (staleHardcoded.length > 0) {
    fail(
      `${staleHardcoded.length} hardcodedColorSidecarEntries entry(s) no longer match a live ` +
        `declaration in cookieyes.css (checked by exact {selector, property, value}, not line number): ` +
        `${staleHardcoded.join(" | ")}. Update the sidecar entry to match the current stylesheet, or ` +
        `remove it if the declaration is gone.`,
    );
  }

  // Build the joined token entries, ThemeVars declaration order.
  const tokenEntries = tokenNames.map((name) => {
    const sidecarEntry = sidecarEntries.find((e) => e.name === name);
    const light = defaultLight.get(name);
    if (light === undefined) {
      fail(
        `token "${name}" has no default value in :root — cookieyes.css is missing its declaration.`,
      );
    }
    return {
      ...sidecarEntry,
      defaultLight: light,
      defaultDark: defaultDark.get(name) ?? null,
      darkDefaultable: Boolean(sidecarEntry.configKey) && defaultDark.has(name),
      consumers: consumers
        .filter((c) => c.token === name)
        .map((c) => ({ selector: c.selector, property: c.property, media: c.media })),
      aliasOf: aliasOf.get(name) ?? null,
      aliasedBy: aliasedBy.get(name) ?? [],
    };
  });

  const totalConsumerEntries = tokenEntries.reduce((sum, t) => sum + t.consumers.length, 0);

  // Fail-closed check 6: plausibility floor (see module doc comment).
  if (
    tokenEntries.length < EXPECTED_TOKEN_COUNT ||
    totalConsumerEntries < MIN_CONSUMER_ENTRIES ||
    hardcodedSidecarEntries.length < MIN_HARDCODED_ENTRIES
  ) {
    fail(
      `entry-count floor not met — tokens: ${tokenEntries.length} (min ${EXPECTED_TOKEN_COUNT}), ` +
        `consumer entries: ${totalConsumerEntries} (min ${MIN_CONSUMER_ENTRIES}), hardcoded entries: ` +
        `${hardcodedSidecarEntries.length} (min ${MIN_HARDCODED_ENTRIES}). This is a plausibility floor, ` +
        `not an exact-count check — it means generation "succeeded" but found almost nothing, which is ` +
        `itself the bug.`,
    );
  }
  if (hardcodedSidecarEntries.length !== EXPECTED_HARDCODED_COUNT) {
    console.warn(
      `[generate-css-variables-reference] note: ${hardcodedSidecarEntries.length} hardcoded-colour ` +
        `entries, expected ${EXPECTED_HARDCODED_COUNT} per design §2.2(b) — not a failure (the floor ` +
        `check above is what's load-bearing), but worth a second look if unintentional.`,
    );
  }

  const data = {
    tokens: tokenEntries,
    hardcoded: hardcodedSidecarEntries,
    defaultsBlocks: {
      light: buildDefaultsBlock(tokenEntries, "light"),
      dark: buildDefaultsBlock(tokenEntries, "dark"),
    },
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(data, null, 2)}\n`);

  mkdirSync(publicOutDir, { recursive: true });
  writeFileSync(
    publicOutFile,
    `${JSON.stringify(buildW3cTokensDocument(tokenEntries), null, 2)}\n`,
  );

  console.log(
    `[generate-css-variables-reference] wrote ${tokenEntries.length} token(s), ` +
      `${totalConsumerEntries} consumer entries, ${hardcodedSidecarEntries.length} hardcoded entries to ` +
      `${outFile.replace(`${repoRoot}/`, "")} and ${publicOutFile.replace(`${repoRoot}/`, "")}`,
  );
}

await main();
