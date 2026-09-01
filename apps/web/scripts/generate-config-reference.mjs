#!/usr/bin/env node
// Extracts the structural facts of `CookieYesConfig` (and its four nested config
// objects — theme/region/i18n/networkBlocker) via the TypeScript compiler API,
// joins them against the hand-maintained sidecar (configuration.sidecar.ts), and
// writes the merged result to `.generated/config-reference.json` for the
// `<ConfigOptionsTable>`/`<ConfigNestedTable>` MDX components to render.
//
// Fails closed (process.exit(1), naming the offending option) on any of:
//   1. compiler extraction yields zero options
//   2. `mode`'s merged type isn't exactly `"cookie-only" | "self-hosted"`
//   3. an extracted option has no matching sidecar entry (undocumented field)
//   4. a sidecar entry has no matching extracted option (stale/removed field)
//
// See ai-context/designs/config-reference-page.md §2.1.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { loadTsSidecarModule } from "./lib/ts-sidecar.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..");
const repoRoot = join(webRoot, "..", "..");
const entry = join(repoRoot, "sdk", "core", "src", "types.ts");
const outDir = join(webRoot, ".generated");
const outFile = join(outDir, "config-reference.json");
const sidecarPath = join(webRoot, "content", "docs", "getting-started", "configuration.sidecar.ts");

const TOP_LEVEL_TYPE_NAME = "CookieYesConfig";

/** The four nested config objects that get their own `<ConfigNestedTable>`. */
const NESTED_TYPE_NAMES = {
  theme: "ThemeConfig",
  region: "RegionConfig",
  i18n: "I18nConfig",
  networkBlocker: "NetworkBlockerConfig",
};

const GROUP_IDS = ["setup", "appearance", "language", "storage", "callbacks"];
const NESTED_PATHS = Object.keys(NESTED_TYPE_NAMES);

function fail(message) {
  console.error(`[generate-config-reference] ${message}`);
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
 * Some nested config types (`NetworkBlockerConfig`) are declared in a sibling
 * module and only re-exported (as a type reference) from `types.ts` — search
 * every first-party source file the program pulled in, not just `entry`.
 */
function findTypeAliasInProgram(program, name) {
  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.fileName.includes("/node_modules/")) continue;
    const found = findTypeAlias(sourceFile, name);
    if (found) return { node: found, sourceFile };
  }
  return undefined;
}

/** Structural facts for one property, as seen on one union constituent. */
function readProperty(checker, symbol, location) {
  const type = checker.getTypeOfSymbolAtLocation(symbol, location);
  const required = !(symbol.flags & ts.SymbolFlags.Optional);
  return { type: checker.typeToString(type), required };
}

function dedupe(values) {
  return [...new Set(values)];
}

/**
 * `mode`'s type differs across branches (`"cookie-only" | "offline"` on the
 * offline/cookie-only branch, `"self-hosted"` on the other) — this is the exact
 * case fail-closed check 2 guards. `"offline"` is a known-deprecated alias for
 * `"cookie-only"` (see `DeprecatedOfflineMode` in types.ts) and is intentionally
 * excluded from the displayed type: the assertion below proves the merge
 * surfaced it (present in `literals`, not silently dropped) rather than either
 * collapsing to one branch or leaking the deprecated alias into the public type.
 */
function mergeModeType(typeStrings) {
  const DEPRECATED_MODE_LITERAL = '"offline"';
  const literals = new Set();
  for (const typeString of typeStrings) {
    for (const literal of typeString.split(" | ")) literals.add(literal.trim());
  }
  if (!literals.has(DEPRECATED_MODE_LITERAL)) {
    fail(
      `mode — expected the deprecated "offline" literal to be present in the raw merged type ` +
        `(got: ${[...literals].join(" | ")}); the merge silently dropped it instead of surfacing it.`,
    );
  }
  const CANONICAL_ORDER = ['"cookie-only"', '"self-hosted"'];
  return CANONICAL_ORDER.filter((literal) => literals.has(literal)).join(" | ");
}

/**
 * Walks `CookieYesConfig`'s union constituents *separately* and unions their
 * properties back together, keyed by name — flattening the union first (e.g.
 * via `checker.getPropertiesOfType(unionType)`) makes the last constituent win
 * and silently drops fields (and, for `mode`, literals) unique to earlier
 * branches. See design §2.1, fail-closed check 2.
 */
function extractTopLevel(checker, node) {
  const type = checker.getTypeAtLocation(node.name);
  const constituents = type.isUnion() ? type.types : [type];
  if (constituents.length === 0) return new Map();

  /** name -> { types: string[], required: boolean[], presentIn: number[] } */
  const byName = new Map();
  constituents.forEach((constituent, index) => {
    for (const symbol of checker.getPropertiesOfType(constituent)) {
      const name = symbol.getName();
      const fact = readProperty(checker, symbol, node.name);
      const existing = byName.get(name);
      if (!existing) {
        byName.set(name, { types: [fact.type], required: [fact.required], presentIn: [index] });
      } else {
        existing.types.push(fact.type);
        existing.required.push(fact.required);
        existing.presentIn.push(index);
      }
    }
  });

  const result = new Map();
  for (const [name, fact] of byName) {
    const branch = fact.presentIn.length === constituents.length ? "common" : "self-hosted-only";
    const required = fact.required.every(Boolean);
    const type = name === "mode" ? mergeModeType(fact.types) : dedupe(fact.types).join(" | ");
    result.set(name, { type, required, branch });
  }
  return result;
}

/** Direct fields of one nested config object (`ThemeConfig`, `RegionConfig`, ...). */
function extractNested(checker, program, nestedPath, typeName) {
  const found = findTypeAliasInProgram(program, typeName);
  if (!found) {
    fail(
      `could not find type alias "${typeName}" (nested path "${nestedPath}") anywhere in the program`,
    );
  }
  const { node } = found;
  const type = checker.getTypeAtLocation(node.name);
  const result = new Map();
  for (const symbol of checker.getPropertiesOfType(type)) {
    const name = symbol.getName();
    const fact = readProperty(checker, symbol, node.name);
    result.set(`${nestedPath}.${name}`, { ...fact, branch: "common" });
  }
  return result;
}

async function main() {
  const program = ts.createProgram([entry], {
    target: ts.ScriptTarget.ESNext,
    lib: ["lib.esnext.d.ts", "lib.dom.d.ts"],
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    strict: true,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(entry);
  if (!sourceFile) fail(`could not load source file ${entry}`);

  const topLevelNode = findTypeAlias(sourceFile, TOP_LEVEL_TYPE_NAME);
  if (!topLevelNode) fail(`could not find type alias "${TOP_LEVEL_TYPE_NAME}" in ${entry}`);

  const topLevel = extractTopLevel(checker, topLevelNode);

  // Fail-closed check 1: extraction yields zero options.
  if (topLevel.size === 0) {
    fail(
      `compiler-API extraction of "${TOP_LEVEL_TYPE_NAME}" yielded zero options — refusing to ` +
        `publish an empty table.`,
    );
  }

  // Fail-closed check 2: mode's merged type must be exactly this (see mergeModeType).
  const modeFact = topLevel.get("mode");
  if (!modeFact)
    fail(`"mode" was not found in the extracted options — the discriminant is missing.`);
  const EXPECTED_MODE_TYPE = '"cookie-only" | "self-hosted"';
  if (modeFact.type !== EXPECTED_MODE_TYPE) {
    fail(
      `mode — merged type is ${JSON.stringify(modeFact.type)}, expected ` +
        `${JSON.stringify(EXPECTED_MODE_TYPE)}. This is the regression guard for flattening ` +
        `CookieYesConfig's union naively (the last branch wins and "mode" reports as only ` +
        `"self-hosted") — the generator must walk each union constituent separately.`,
    );
  }

  const extracted = new Map(topLevel);
  for (const [nestedPath, typeName] of Object.entries(NESTED_TYPE_NAMES)) {
    for (const [path, fact] of extractNested(checker, program, nestedPath, typeName)) {
      extracted.set(path, fact);
    }
  }

  const sidecarEntries = await loadTsSidecarModule(sidecarPath, "configSidecarEntries");

  // Fail-closed check 3: any extracted option with no matching sidecar entry.
  const sidecarPaths = new Set(sidecarEntries.map((e) => e.path));
  const undocumented = [...extracted.keys()].filter((path) => !sidecarPaths.has(path));
  if (undocumented.length > 0) {
    fail(
      `${undocumented.length} option(s) extracted from the SDK have no sidecar entry in ` +
        `configuration.sidecar.ts: ${undocumented.join(", ")}. Add a SidecarEntry for each.`,
    );
  }

  // Fail-closed check 4: any sidecar entry with no matching extracted option.
  const extractedPaths = new Set(extracted.keys());
  const stale = sidecarEntries.filter((e) => !extractedPaths.has(e.path)).map((e) => e.path);
  if (stale.length > 0) {
    fail(
      `${stale.length} sidecar entry(s) in configuration.sidecar.ts have no matching option in ` +
        `the SDK: ${stale.join(", ")}. Remove them (this is the check that would have caught ` +
        `consentCategories / theme.buttonVariant / theme.widgetPosition staying documented after removal).`,
    );
  }

  const groups = Object.fromEntries(GROUP_IDS.map((id) => [id, []]));
  const nested = Object.fromEntries(NESTED_PATHS.map((id) => [id, []]));

  for (const sidecarEntry of sidecarEntries) {
    const fact = extracted.get(sidecarEntry.path);
    const merged = { ...sidecarEntry, ...fact };
    const [maybeNestedRoot] = sidecarEntry.path.split(".");
    if (sidecarEntry.path.includes(".") && NESTED_PATHS.includes(maybeNestedRoot)) {
      nested[maybeNestedRoot].push(merged);
    } else {
      groups[sidecarEntry.group].push(merged);
    }
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, `${JSON.stringify({ groups, nested }, null, 2)}\n`);

  console.log(
    `[generate-config-reference] wrote ${sidecarEntries.length} option(s) (` +
      `${GROUP_IDS.map((id) => `${id}: ${groups[id].length}`).join(", ")}; ` +
      `nested — ${NESTED_PATHS.map((id) => `${id}: ${nested[id].length}`).join(", ")}) to ` +
      `${outFile.replace(`${repoRoot}/`, "")}`,
  );
}

await main();
