#!/usr/bin/env node
// Extracts the structural facts (type, required) of the six components' props
// types via the TypeScript compiler API, joins them against the hand-maintained
// sidecar (component-props.sidecar.ts), and writes the merged result to
// `.generated/component-reference.json` for the `<ComponentPropsTable>` MDX
// component to render.
//
// Sibling to `generate-config-reference.mjs`, following the same pattern
// (compiler-API extraction -> join against a checked-in sidecar -> fail closed
// -> write `.generated/*.json`) but as its own file, since none of the six
// component prop types are discriminated unions the way `CookieYesConfig` is —
// see ai-context/designs/component-reference-docs.md §2.1.
//
// Fails closed (process.exit(1), naming the offending item) on any of:
//   1. compiler extraction yields zero props for a component
//   2. COMPLETENESS — a listed component (see COMPONENTS) has zero extracted
//      props or zero sidecar entries
//   3. an extracted prop has no matching sidecar entry (undocumented prop)
//   4. a sidecar entry has no matching extracted prop (stale/removed prop)
//
// See design §2.4.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { loadTsSidecarModule } from "./lib/ts-sidecar.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..");
const repoRoot = join(webRoot, "..", "..");
const reactSrcRoot = join(repoRoot, "sdk", "react", "src");
const outDir = join(webRoot, ".generated");
const outFile = join(outDir, "component-reference.json");
const sidecarPath = join(webRoot, "content", "docs", "components", "component-props.sidecar.ts");

/**
 * The six components with real props, and the file each one's `*Props` type
 * alias is declared in. `ReloadNotice` takes no props at all — deliberately
 * excluded, see design §2.4.
 */
const COMPONENT_FILES = {
  CookieBanner: join(reactSrcRoot, "presets", "CookieBanner.tsx"),
  CookiePreferences: join(reactSrcRoot, "presets", "CookiePreferences.tsx"),
  CookieOptOut: join(reactSrcRoot, "presets", "CookieOptOut.tsx"),
  RecallButton: join(reactSrcRoot, "controls", "RecallButton.tsx"),
  GatedScript: join(reactSrcRoot, "controls", "GatedScript.tsx"),
  GatedFrame: join(reactSrcRoot, "controls", "GatedFrame.tsx"),
};

const COMPONENT_TYPE_NAMES = {
  CookieBanner: "CookieBannerProps",
  CookiePreferences: "CookiePreferencesProps",
  CookieOptOut: "CookieOptOutProps",
  RecallButton: "RecallButtonProps",
  GatedScript: "GatedScriptProps",
  GatedFrame: "GatedFrameProps",
};

const COMPONENTS = Object.keys(COMPONENT_FILES);

/**
 * Components whose Props type is a plain, closed object literal — every
 * property is documented individually, the same mechanical walk
 * `generate-config-reference.mjs`'s `extractNested` does for `ThemeConfig` and
 * friends.
 */
const PLAIN_COMPONENTS = new Set([
  "CookieBanner",
  "CookiePreferences",
  "CookieOptOut",
  "GatedScript",
]);

/**
 * `RecallButton` and `GatedFrame` additionally extend a native DOM element's
 * full HTML attribute set (`ComponentPropsWithoutRef<"button">`,
 * `Omit<IframeHTMLAttributes<...>, "src">`). Documenting every one of the
 * ~150 inherited HTML/ARIA attributes individually would make the table
 * useless (and would require ~150 sidecar entries to match it prop-for-prop).
 * Instead: each component's own declared fields are extracted mechanically
 * (same as PLAIN_COMPONENTS), a small number of individually significant
 * native props are extracted mechanically by name (because they carry
 * component-specific behavioural notes documented in the sidecar — see
 * component-props.sidecar.ts), and everything else collapses into one
 * synthetic `"...rest"` row. See design §8's entry-count note.
 */
const EXTENDED_COMPONENTS = {
  RecallButton: {
    ownFields: ["children"],
    namedNativeProps: ["className", "onClick"],
    restPath: "...rest",
    restType: 'Omit<ComponentPropsWithoutRef<"button">, "className" | "onClick">',
  },
  GatedFrame: {
    ownFields: ["src", "category", "placeholder"],
    namedNativeProps: [],
    restPath: "...rest",
    restType: 'Omit<IframeHTMLAttributes<HTMLIFrameElement>, "src" | "category" | "placeholder">',
  },
};

/**
 * `ref` is added to `RecallButton` by `React.forwardRef` — it is genuinely not
 * a member of `RecallButtonProps` itself (that type is built from
 * `ComponentPropsWithoutRef`, which excludes `ref` by design), so it cannot be
 * read off the type the way every other row here can. Documented as a fixed,
 * hand-written fact instead of a compiler-API read.
 */
const SYNTHETIC_PROPS = {
  RecallButton: [{ path: "ref", type: "Ref<HTMLButtonElement>", required: false }],
};

function fail(message) {
  console.error(`[generate-component-reference] ${message}`);
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

function readSymbol(checker, symbol, location) {
  const type = checker.getTypeOfSymbolAtLocation(symbol, location);
  const required = !(symbol.flags & ts.SymbolFlags.Optional);
  return { type: checker.typeToString(type), required };
}

function readNamedProperty(checker, type, location, name, component) {
  const symbol = checker.getPropertyOfType(type, name);
  if (!symbol) {
    fail(
      `expected property "${name}" on "${component}"'s resolved props type but it was not ` +
        `found — the SDK's shape changed; update generate-component-reference.mjs's ` +
        `EXTENDED_COMPONENTS/SYNTHETIC_PROPS to match.`,
    );
  }
  return readSymbol(checker, symbol, location);
}

/** Every direct property of a plain, closed object-literal props type. */
function extractPlainComponent(checker, node) {
  const type = checker.getTypeAtLocation(node.name);
  const result = new Map();
  for (const symbol of checker.getPropertiesOfType(type)) {
    result.set(symbol.getName(), readSymbol(checker, symbol, node.name));
  }
  return result;
}

/** Own fields + curated native props + one synthetic collapsed "...rest" row. */
function extractExtendedComponent(checker, node, component, config) {
  const type = checker.getTypeAtLocation(node.name);
  const result = new Map();
  for (const name of [...config.ownFields, ...config.namedNativeProps]) {
    result.set(name, readNamedProperty(checker, type, node.name, name, component));
  }
  for (const synthetic of SYNTHETIC_PROPS[component] ?? []) {
    result.set(synthetic.path, { type: synthetic.type, required: synthetic.required });
  }
  result.set(config.restPath, { type: config.restType, required: false });
  return result;
}

async function main() {
  const program = ts.createProgram(Object.values(COMPONENT_FILES), {
    target: ts.ScriptTarget.ESNext,
    lib: ["lib.esnext.d.ts", "lib.dom.d.ts"],
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();

  const extractedByComponent = {};

  for (const component of COMPONENTS) {
    const file = COMPONENT_FILES[component];
    const typeName = COMPONENT_TYPE_NAMES[component];
    const sourceFile = program.getSourceFile(file);
    if (!sourceFile) fail(`could not load source file ${file} (component "${component}")`);

    const node = findTypeAlias(sourceFile, typeName);
    if (!node)
      fail(`could not find type alias "${typeName}" (component "${component}") in ${file}`);

    const extracted = PLAIN_COMPONENTS.has(component)
      ? extractPlainComponent(checker, node)
      : extractExtendedComponent(checker, node, component, EXTENDED_COMPONENTS[component]);

    // Fail-closed check 1: compiler extraction yields zero props.
    if (extracted.size === 0) {
      fail(
        `compiler-API extraction of "${typeName}" (component "${component}") yielded zero props ` +
          `— refusing to publish an empty table.`,
      );
    }

    extractedByComponent[component] = extracted;
  }

  const sidecarEntries = await loadTsSidecarModule(sidecarPath, "componentSidecarEntries");

  // Fail-closed check 2 (COMPLETENESS): every listed component must have both
  // extracted props (already guaranteed by check 1 above) and at least one
  // sidecar entry.
  for (const component of COMPONENTS) {
    const sidecarCount = sidecarEntries.filter((entry) => entry.component === component).length;
    if (sidecarCount === 0) {
      fail(
        `"${component}" is listed in COMPONENTS but has zero entries in ` +
          `component-props.sidecar.ts — every listed component must be documented.`,
      );
    }
  }

  // Fail-closed check 3: any extracted prop with no matching sidecar entry.
  const undocumented = [];
  for (const component of COMPONENTS) {
    const sidecarPaths = new Set(
      sidecarEntries.filter((entry) => entry.component === component).map((entry) => entry.path),
    );
    for (const path of extractedByComponent[component].keys()) {
      if (!sidecarPaths.has(path)) undocumented.push(`${component}.${path}`);
    }
  }
  if (undocumented.length > 0) {
    fail(
      `${undocumented.length} prop(s) extracted from the SDK have no sidecar entry in ` +
        `component-props.sidecar.ts: ${undocumented.join(", ")}. Add a ComponentSidecarEntry for each.`,
    );
  }

  // Fail-closed check 4: any sidecar entry with no matching extracted prop.
  const stale = [];
  for (const entry of sidecarEntries) {
    const extracted = extractedByComponent[entry.component];
    if (!extracted?.has(entry.path)) stale.push(`${entry.component}.${entry.path}`);
  }
  if (stale.length > 0) {
    fail(
      `${stale.length} sidecar entry(s) in component-props.sidecar.ts have no matching prop in ` +
        `the SDK: ${stale.join(", ")}. Remove them.`,
    );
  }

  const components = Object.fromEntries(COMPONENTS.map((component) => [component, []]));
  for (const entry of sidecarEntries) {
    const fact = extractedByComponent[entry.component].get(entry.path);
    components[entry.component].push({ ...entry, ...fact });
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, `${JSON.stringify({ components }, null, 2)}\n`);

  console.log(
    `[generate-component-reference] wrote ${sidecarEntries.length} prop(s) (` +
      `${COMPONENTS.map((component) => `${component}: ${components[component].length}`).join(", ")}) to ` +
      `${outFile.replace(`${repoRoot}/`, "")}`,
  );
}

await main();
