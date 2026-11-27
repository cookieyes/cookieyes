#!/usr/bin/env node
// Extracts the structural facts (type, required) of the six components' props
// types via the TypeScript compiler API, joins them against the hand-maintained
// sidecar (component-props.sidecar.ts), and writes the merged result to
// `.generated/component-reference.json` for the `<ComponentPropsTable>` MDX
// component to render. It does this once per adapter (React, whose table Next.js pages
// share, Vue, whose table Nuxt pages share, Svelte, whose table SvelteKit pages share, and
// Astro), each against its own source and its own sidecar.
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
const outDir = join(webRoot, ".generated");
const outFile = join(outDir, "component-reference.json");
const contentComponentsDir = join(webRoot, "content", "shared", "components");

const COMPONENT_TYPE_NAMES = {
  CookieBanner: "CookieBannerProps",
  CookiePreferences: "CookiePreferencesProps",
  CookieOptOut: "CookieOptOutProps",
  RecallButton: "RecallButtonProps",
  GatedScript: "GatedScriptProps",
  GatedFrame: "GatedFrameProps",
};

const COMPONENTS = Object.keys(COMPONENT_TYPE_NAMES);

/**
 * Components whose Props type is a plain, closed object literal: every property is
 * documented individually, the same mechanical walk `generate-config-reference.mjs`'s
 * `extractNested` does for `ThemeConfig` and friends. The same in both adapters.
 */
const PLAIN_COMPONENTS = new Set([
  "CookieBanner",
  "CookiePreferences",
  "CookieOptOut",
  "GatedScript",
]);

/**
 * One entry per adapter whose components get a props table. Each has its own source
 * files, its own compiler settings, its own sidecar and its own list of components that
 * extend a native element's attribute set. Every fail-closed check below runs once per
 * adapter, so a Vue table that cannot be generated fails the build exactly as React's does.
 *
 * `RecallButton` and `GatedFrame` additionally extend a native DOM element's full HTML
 * attribute set. Documenting every one of the ~150 inherited HTML/ARIA attributes
 * individually would make the table useless (and would require ~150 sidecar entries to match
 * it prop-for-prop). Instead: each component's own declared fields are extracted
 * mechanically (same as PLAIN_COMPONENTS), a small number of individually significant native
 * props are extracted mechanically by name (because they carry component-specific behavioural
 * notes documented in the sidecar), and everything else collapses into one synthetic
 * `"...rest"` row. See design §8's entry-count note.
 *
 * `synthetic` rows cannot be read off the props type, so they are fixed, hand-written facts
 * about the component: React's `ref` is added by `forwardRef` (the type is built from
 * `ComponentPropsWithoutRef`, which excludes it), and Vue slots are not props at all. Svelte
 * snippets (`children`, `placeholder`) are props, so they are read off the type like any other.
 * Svelte components are `.svelte` files the compiler API cannot read; their props types live in
 * plain `types.ts` modules, which is where they are read from. The same goes for Astro, whose
 * components are `.astro` files: `components.d.ts` declares each as `AstroComponent<Props>`, so
 * `declared` reads the props from that type argument instead of a `<Name>Props` alias, and
 * `plain` lists the components whose props are all documented individually, because only
 * `GatedFrame` extends a native element there.
 */
const ADAPTERS = {
  react: {
    srcRoot: join(repoRoot, "sdk", "react", "src"),
    files: {
      CookieBanner: ["presets", "CookieBanner.tsx"],
      CookiePreferences: ["presets", "CookiePreferences.tsx"],
      CookieOptOut: ["presets", "CookieOptOut.tsx"],
      RecallButton: ["controls", "RecallButton.tsx"],
      GatedScript: ["controls", "GatedScript.tsx"],
      GatedFrame: ["controls", "GatedFrame.tsx"],
    },
    sidecarPath: join(contentComponentsDir, "component-props.sidecar.ts"),
    jsx: ts.JsxEmit.ReactJSX,
    extended: {
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
        restType:
          'Omit<IframeHTMLAttributes<HTMLIFrameElement>, "src" | "category" | "placeholder">',
      },
    },
    synthetic: {
      RecallButton: [{ path: "ref", type: "Ref<HTMLButtonElement>", required: false }],
    },
  },
  vue: {
    srcRoot: join(repoRoot, "sdk", "vue", "src"),
    files: {
      CookieBanner: ["presets", "CookieBanner.ts"],
      CookiePreferences: ["presets", "CookiePreferences.ts"],
      CookieOptOut: ["presets", "CookieOptOut.ts"],
      RecallButton: ["controls", "RecallButton.ts"],
      GatedScript: ["controls", "GatedScript.ts"],
      GatedFrame: ["controls", "GatedFrame.ts"],
    },
    sidecarPath: join(contentComponentsDir, "component-props.vue.sidecar.ts"),
    jsx: ts.JsxEmit.Preserve,
    extended: {
      RecallButton: {
        ownFields: [],
        namedNativeProps: ["class", "onClick"],
        restPath: "...rest",
        restType: 'Omit<ButtonHTMLAttributes, "class" | "onClick">',
      },
      GatedFrame: {
        ownFields: ["src", "category"],
        namedNativeProps: [],
        restPath: "...rest",
        restType: 'Omit<IframeHTMLAttributes, "src" | "category">',
      },
    },
    synthetic: {
      RecallButton: [{ path: "#default", type: "() => unknown", required: false }],
      GatedFrame: [{ path: "#placeholder", type: "() => unknown", required: false }],
    },
  },
  svelte: {
    srcRoot: join(repoRoot, "sdk", "svelte", "src"),
    files: {
      CookieBanner: ["presets", "types.ts"],
      CookiePreferences: ["presets", "types.ts"],
      CookieOptOut: ["presets", "types.ts"],
      RecallButton: ["controls", "types.ts"],
      GatedScript: ["controls", "types.ts"],
      GatedFrame: ["controls", "types.ts"],
    },
    sidecarPath: join(contentComponentsDir, "component-props.svelte.sidecar.ts"),
    jsx: ts.JsxEmit.Preserve,
    extended: {
      RecallButton: {
        ownFields: ["children"],
        namedNativeProps: ["class", "onclick"],
        restPath: "...rest",
        restType: 'Omit<HTMLButtonAttributes, "children" | "class" | "onclick">',
      },
      GatedFrame: {
        ownFields: ["src", "category", "placeholder"],
        namedNativeProps: [],
        restPath: "...rest",
        restType: 'Omit<HTMLIframeAttributes, "src" | "children">',
      },
    },
    synthetic: {},
  },
  astro: {
    srcRoot: join(repoRoot, "sdk", "astro", "src"),
    declared: true,
    files: {
      CookieBanner: ["components", "components.d.ts"],
      CookiePreferences: ["components", "components.d.ts"],
      CookieOptOut: ["components", "components.d.ts"],
      RecallButton: ["components", "components.d.ts"],
      GatedScript: ["components", "components.d.ts"],
      GatedFrame: ["components", "components.d.ts"],
    },
    sidecarPath: join(contentComponentsDir, "component-props.astro.sidecar.ts"),
    jsx: ts.JsxEmit.Preserve,
    plain: new Set([
      "CookieBanner",
      "CookiePreferences",
      "CookieOptOut",
      "RecallButton",
      "GatedScript",
    ]),
    extended: {
      GatedFrame: {
        ownFields: ["src", "category"],
        namedNativeProps: [],
        restPath: "...rest",
        restType: 'Omit<HTMLAttributes<"iframe">, "src" | "category">',
      },
    },
    synthetic: {
      GatedFrame: [{ path: "placeholder (slot)", type: "HTML", required: false }],
    },
  },
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

/**
 * The props of an Astro component: the type argument of `export declare const <Name>:
 * AstroComponent<Props>`.
 */
function findDeclaredProps(checker, sourceFile, name) {
  let found;
  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const declaration of node.declarationList.declarations) {
      const typeNode = declaration.type;
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === name &&
        typeNode &&
        ts.isTypeReferenceNode(typeNode) &&
        typeNode.typeArguments?.[0]
      ) {
        const [propsNode] = typeNode.typeArguments;
        found = { type: checker.getTypeFromTypeNode(propsNode), location: propsNode };
      }
    }
  });
  return found;
}

function readSymbol(checker, symbol, location) {
  const type = checker.getTypeOfSymbolAtLocation(symbol, location);
  const required = !(symbol.flags & ts.SymbolFlags.Optional);
  return { type: checker.typeToString(type), required };
}

function readNamedProperty(checker, type, location, name, component, adapter) {
  const symbol = checker.getPropertyOfType(type, name);
  if (!symbol) {
    fail(
      `expected property "${name}" on the ${adapter} "${component}"'s resolved props type but it ` +
        `was not found: the SDK's shape changed; update generate-component-reference.mjs's ` +
        `ADAPTERS.${adapter} (extended/synthetic) to match.`,
    );
  }
  return readSymbol(checker, symbol, location);
}

/** Every direct property of a plain, closed object-literal props type. */
function extractPlainComponent(checker, { type, location }) {
  const result = new Map();
  for (const symbol of checker.getPropertiesOfType(type)) {
    result.set(symbol.getName(), readSymbol(checker, symbol, location));
  }
  return result;
}

/** Own fields + curated native props + hand-written rows + one collapsed "...rest" row. */
function extractExtendedComponent(
  checker,
  { type, location },
  component,
  config,
  synthetic,
  adapter,
) {
  const result = new Map();
  for (const name of [...config.ownFields, ...config.namedNativeProps]) {
    result.set(name, readNamedProperty(checker, type, location, name, component, adapter));
  }
  for (const row of synthetic[component] ?? []) {
    result.set(row.path, { type: row.type, required: row.required });
  }
  result.set(config.restPath, { type: config.restType, required: false });
  return result;
}

/**
 * Generates one adapter's table data and runs the fail-closed checks against its sidecar.
 * Returns `{ [component]: MergedComponentOption[] }`; never returns an empty table.
 */
async function generateAdapter(adapter, config) {
  const files = Object.fromEntries(
    COMPONENTS.map((component) => [component, join(config.srcRoot, ...config.files[component])]),
  );
  const program = ts.createProgram([...new Set(Object.values(files))], {
    target: ts.ScriptTarget.ESNext,
    lib: ["lib.esnext.d.ts", "lib.dom.d.ts"],
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    jsx: config.jsx,
    strict: true,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();

  const extractedByComponent = {};

  for (const component of COMPONENTS) {
    const file = files[component];
    const typeName = COMPONENT_TYPE_NAMES[component];
    const sourceFile = program.getSourceFile(file);
    if (!sourceFile) fail(`could not load source file ${file} (${adapter} "${component}")`);

    let props;
    if (config.declared) {
      props = findDeclaredProps(checker, sourceFile, component);
      if (!props) {
        fail(
          `could not find "declare const ${component}: AstroComponent<…>" (${adapter}) in ${file}`,
        );
      }
    } else {
      const node = findTypeAlias(sourceFile, typeName);
      if (!node) {
        fail(`could not find type alias "${typeName}" (${adapter} "${component}") in ${file}`);
      }
      props = { type: checker.getTypeAtLocation(node.name), location: node.name };
    }

    const extracted = (config.plain ?? PLAIN_COMPONENTS).has(component)
      ? extractPlainComponent(checker, props)
      : extractExtendedComponent(
          checker,
          props,
          component,
          config.extended[component],
          config.synthetic,
          adapter,
        );

    // Fail-closed check 1: compiler extraction yields zero props.
    if (extracted.size === 0) {
      fail(
        `compiler-API extraction of the ${adapter} "${typeName}" (component "${component}") ` +
          `yielded zero props: refusing to publish an empty table.`,
      );
    }

    extractedByComponent[component] = extracted;
  }

  const sidecarEntries = await loadTsSidecarModule(config.sidecarPath, "componentSidecarEntries");
  const sidecarName = config.sidecarPath.replace(`${contentComponentsDir}/`, "");

  // Fail-closed check 2 (COMPLETENESS): every listed component must have at least one
  // sidecar entry (extracted props are already guaranteed by check 1).
  for (const component of COMPONENTS) {
    const sidecarCount = sidecarEntries.filter((entry) => entry.component === component).length;
    if (sidecarCount === 0) {
      fail(
        `${adapter} "${component}" is listed in COMPONENTS but has zero entries in ` +
          `${sidecarName}: every listed component must be documented.`,
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
      `${undocumented.length} ${adapter} prop(s) extracted from the SDK have no sidecar entry in ` +
        `${sidecarName}: ${undocumented.join(", ")}. Add a ComponentSidecarEntry for each.`,
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
      `${stale.length} sidecar entry(s) in ${sidecarName} have no matching prop in the ` +
        `${adapter} SDK: ${stale.join(", ")}. Remove them.`,
    );
  }

  const components = Object.fromEntries(COMPONENTS.map((component) => [component, []]));
  for (const entry of sidecarEntries) {
    const fact = extractedByComponent[entry.component].get(entry.path);
    components[entry.component].push({ ...entry, ...fact });
  }
  return components;
}

async function main() {
  const byAdapter = {};
  for (const [adapter, config] of Object.entries(ADAPTERS)) {
    byAdapter[adapter] = await generateAdapter(adapter, config);
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(byAdapter, null, 2)}\n`);

  const summary = Object.entries(byAdapter)
    .map(
      ([adapter, components]) =>
        `${adapter} (${COMPONENTS.map((c) => `${c}: ${components[c].length}`).join(", ")})`,
    )
    .join("; ");
  console.log(
    `[generate-component-reference] wrote ${summary} to ${outFile.replace(`${repoRoot}/`, "")}`,
  );
}

await main();
