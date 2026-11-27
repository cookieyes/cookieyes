export function insertImport(src: string, importLine: string): string {
  const importRegex = /^import\s.+$/gm;
  let lastImportEnd = -1;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(src)) !== null) {
    lastImportEnd = match.index + match[0].length;
  }
  if (lastImportEnd > -1) {
    return src.slice(0, lastImportEnd) + `\n${importLine}` + src.slice(lastImportEnd);
  }
  return `${importLine}\n${src}`;
}

export function patchNextjsLayout(src: string): string | null {
  if (src.includes("CookieYesRoot") && src.includes("consent-manager")) return null;

  let patched = insertImport(src, `import { CookieYesRoot } from "@/components/consent-manager";`);

  patched = patched.replace(/\{children\}/g, `{children}\n        <CookieYesRoot />`);

  return patched === src ? null : patched;
}

export function patchNextjsPagesApp(src: string): string | null {
  if (src.includes("CookieYesRoot") && src.includes("consent-manager")) return null;

  const componentTagPattern = /<Component\s+\{\.\.\.pageProps\}\s*\/>/;
  if (!componentTagPattern.test(src)) return null;

  let patched = insertImport(src, `import { CookieYesRoot } from "@/components/consent-manager";`);

  patched = patched.replace(
    componentTagPattern,
    `<>\n      <Component {...pageProps} />\n      <CookieYesRoot />\n    </>`,
  );

  return patched === src ? null : patched;
}

const VUE_MAIN_IMPORT = "./consent-manager";
const VUE_ROOT_IMPORT = "./components/CookieYesRoot.vue";

/** Quote and semicolon style of the file's last import, so an added line matches it. */
function importStyle(src: string): { quote: string; semi: string } {
  const imports = src.match(/^import\s.+$/gm);
  const last = imports?.[imports.length - 1];
  if (!last) return { quote: '"', semi: ";" };
  return { quote: last.includes("'") ? "'" : '"', semi: last.trimEnd().endsWith(";") ? ";" : "" };
}

/** A multi-line import would make `insertImport` cut it in half, so such a file is left alone. */
function hasMultilineImport(src: string): boolean {
  return /^import\s*(?:type\s+)?[\w$]*\s*,?\s*\{[^}\n]*$/m.test(src);
}

/**
 * Add `setupConsent(app)` to a Vue entry file. Handles the one-line
 * `createApp(App).mount("#app")` of `npm create vue` (with any `.use(...)` calls in the chain)
 * and a `const app = createApp(...)` file. Returns null when already patched or when the file
 * has neither shape, so the caller prints the manual step instead of guessing.
 */
export function patchVueMain(src: string): string | null {
  if (src.includes("setupConsent")) return null;
  if (hasMultilineImport(src)) return null;
  const { quote, semi } = importStyle(src);
  const importLine = `import { setupConsent } from ${quote}${VUE_MAIN_IMPORT}${quote}${semi}`;

  const chained =
    /^([ \t]*)(createApp\([^()]*\)(?:\s*\.use\([^()]*\))*)\.mount\(([^()]*)\)(;?)[ \t]*$/m;
  const found = chained.exec(src);
  if (found) {
    // `app` is a new name here; if the file already uses it, the rewrite could shadow or clash.
    if (/(?<![\w$.])app\b/.test(src.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, ""))) return null;
    const [whole, indent = "", chain = "", target = "", end = ""] = found;
    const rewritten = [
      `${indent}const app = ${chain}${end}`,
      `${indent}setupConsent(app)${end}`,
      `${indent}app.mount(${target})${end}`,
    ].join("\n");
    return insertImport(
      src.replace(whole, () => rewritten),
      importLine,
    );
  }

  if (!/^[ \t]*(?:const|let)\s+app\s*=\s*createApp\(/m.test(src)) return null;
  const mount = /^([ \t]*)app\.mount\(.*?(;?)[ \t]*$/m.exec(src);
  if (!mount) return null;
  const [line, indent = "", end = ""] = mount;
  return insertImport(
    src.replace(line, () => `${indent}setupConsent(app)${end}\n${line}`),
    importLine,
  );
}

/**
 * Render `<CookieYesRoot />` first in a Vue root component's template and import it in its
 * `<script setup>`. Returns null when already patched or when there is no `<script setup>` or
 * `<template>` to put them in (an Options API component), so the caller prints the manual step.
 */
export function patchVueApp(src: string): string | null {
  if (src.includes("CookieYesRoot")) return null;
  const script = /(<script\b[^>]*\bsetup\b[^>]*>)([\s\S]*?)(<\/script>)/.exec(src);
  if (!script) return null;
  const [whole, open = "", body = "", close = ""] = script;
  if (hasMultilineImport(body)) return null;
  if (!/^<template(?:\s[^>]*)?>/m.test(src)) return null;

  const { quote, semi } = importStyle(body);
  const importLine = `import CookieYesRoot from ${quote}${VUE_ROOT_IMPORT}${quote}${semi}`;
  // `insertImport` would put the line on the same row as the opening tag when the block has no
  // imports yet.
  const newBody = /^import\s/m.test(body)
    ? insertImport(body, importLine)
    : `\n${importLine}${body.startsWith("\n") ? body : `\n${body}`}`;
  return renderRootFirst(src.replace(whole, () => `${open}${newBody}${close}`));
}

/** Put `<CookieYesRoot />` first in the component's template, indented like what follows it. */
function renderRootFirst(src: string): string | null {
  const template = /^<template(?:\s[^>]*)?>/m.exec(src);
  if (!template) return null;
  const end = template.index + template[0].length;
  const indent = /\n([ \t]*)\S/.exec(src.slice(end))?.[1] ?? "  ";
  return `${src.slice(0, end)}\n${indent}<CookieYesRoot />${src.slice(end)}`;
}

/**
 * Render `<CookieYesRoot />` first in a Nuxt `app.vue`, before `<NuxtPage />` or whatever else
 * the template holds. The module auto-imports the component, so no import is added. Returns null
 * when already patched or when the file has no template.
 */
export function patchNuxtApp(src: string): string | null {
  if (src.includes("CookieYesRoot")) return null;
  return renderRootFirst(src);
}

const SVELTE_STYLES_IMPORT = "@cookieyes/svelte/styles.css";
const SVELTE_ROOT_IMPORT = "./lib/CookieYesRoot.svelte";

/**
 * Import the stylesheet in a Svelte entry file. A missing import leaves the banner unstyled and
 * nothing warns, so the file is only edited when it is recognisably an entry (it imports a
 * `.svelte` component). Returns null when already patched or when it is not, so the caller prints
 * the manual step instead of guessing.
 */
export function patchSvelteMain(src: string): string | null {
  if (src.includes(SVELTE_STYLES_IMPORT)) return null;
  if (hasMultilineImport(src)) return null;
  if (!/^import\s.+\.svelte["'`]/m.test(src)) return null;
  const { quote, semi } = importStyle(src);
  return insertImport(src, `import ${quote}${SVELTE_STYLES_IMPORT}${quote}${semi}`);
}

/**
 * Import `CookieYesRoot` in a Svelte root component's instance `<script>` and render it last in
 * the markup, before a trailing `<style>` block. A `<script module>` is skipped: the import
 * belongs with the component's own. Returns null when already patched or when there is no
 * instance script to put the import in, so the caller prints the manual step.
 */
export function patchSvelteApp(src: string): string | null {
  if (src.includes("CookieYesRoot")) return null;
  const scripts = src.matchAll(/(<script\b([^>]*)>)([\s\S]*?)(<\/script\b[^>]*>)/gi);
  const script = [...scripts].find((m) => !/\b(?:module|context\s*=)/.test(m[2] ?? ""));
  if (!script) return null;
  const [whole, open = "", , body = "", close = ""] = script;
  // Script contents are indented, so the Vue helpers, which expect imports at column 0, do not
  // see them.
  if (/^[ \t]*import\s*(?:type\s+)?[\w$]*\s*,?\s*\{[^}\n]*$/m.test(body)) return null;

  const imports = [...body.matchAll(/^([ \t]*)import\s.+$/gm)];
  const last = imports[imports.length - 1];
  const { quote, semi } = importStyle(last?.[0].trim() ?? "");
  const importLine = `import CookieYesRoot from ${quote}${SVELTE_ROOT_IMPORT}${quote}${semi}`;
  const newBody = last
    ? `${body.slice(0, last.index + last[0].length)}\n${last[1]}${importLine}${body.slice(last.index + last[0].length)}`
    : `\n  ${importLine}${body.startsWith("\n") ? body : `\n${body}`}`;
  const withScript = src.replace(whole, () => `${open}${newBody}${close}`);

  const style = /^<style\b/m.exec(withScript);
  if (style) {
    return `${withScript.slice(0, style.index)}<CookieYesRoot />\n\n${withScript.slice(style.index)}`;
  }
  return `${withScript.trimEnd()}\n\n<CookieYesRoot />\n`;
}

const NUXT_MODULE = "@cookieyes/nuxt";

/** Index just past the string or comment that starts at `i`, or `i` when none starts there. */
function skipLiteral(src: string, i: number): number {
  const c = src.charAt(i);
  if (c === '"' || c === "'" || c === "`") {
    let j = i + 1;
    while (j < src.length && src.charAt(j) !== c) j += src.charAt(j) === "\\" ? 2 : 1;
    return j + 1;
  }
  if (src.startsWith("//", i)) {
    const end = src.indexOf("\n", i);
    return end === -1 ? src.length : end;
  }
  if (src.startsWith("/*", i)) {
    const end = src.indexOf("*/", i + 2);
    return end === -1 ? src.length : end + 2;
  }
  return i;
}

/**
 * Walk the bracket at `open` to its closing bracket, skipping strings and comments. `visit` sees
 * every other character directly inside it (depth 1). Returns the closing index, or -1.
 */
function walkBracket(src: string, open: number, visit?: (i: number) => void): number {
  let depth = 0;
  for (let i = open; i < src.length; ) {
    const next = skipLiteral(src, i);
    if (next !== i) {
      i = next;
      continue;
    }
    const c = src.charAt(i);
    if (c === "{" || c === "[" || c === "(") depth++;
    else if (c === "}" || c === "]" || c === ")") {
      depth--;
      if (depth === 0) return i;
    } else if (depth === 1) visit?.(i);
    i++;
  }
  return -1;
}

/**
 * Add `"@cookieyes/nuxt"` to the `modules` array of `defineNuxtConfig({...})`, creating the array
 * when the config has none. Returns null when the module is already listed, and also when the file
 * has a shape where an edit could be wrong: no single `defineNuxtConfig({`, a spread that may hold
 * its own `modules`, a `modules` that is not an array literal, or a comment inside the array. The
 * caller then prints the manual step; a second `modules` key would silently drop the first.
 */
export function patchNuxtConfig(src: string): string | null {
  if (/["']@cookieyes\/nuxt["']/.test(src)) return null;
  const calls = [...src.matchAll(/\bdefineNuxtConfig\s*\(\s*\{/g)];
  const call = calls[0];
  if (calls.length !== 1 || call === undefined) return null;
  const open = call.index + call[0].length - 1;

  let modules = -1;
  let spread = false;
  // The last character seen directly in the object, past comments: a key follows `{` or `,`.
  let prev = "{";
  const close = walkBracket(src, open, (i) => {
    if (src.startsWith("...", i)) spread = true;
    const key = /^modules\s*:\s*/.exec(src.slice(i, i + 40));
    if (key && (prev === "{" || prev === ",")) modules = i + key[0].length;
    if (/\S/.test(src.charAt(i))) prev = src.charAt(i);
  });
  if (close === -1 || spread) return null;

  const quote = /["']/.exec(src.slice(open, close))?.[0] ?? '"';
  const entry = `${quote}${NUXT_MODULE}${quote}`;

  if (modules === -1) {
    // A nested `modules:` (Vite's CSS modules, say) is left to the developer rather than risk
    // giving a top-level one a twin.
    if (/\bmodules\s*:/.test(src.slice(open, close))) return null;
    const body = src.slice(open + 1, close);
    if (body.trim() === "")
      return `${src.slice(0, open)}{ modules: [${entry}] }${src.slice(close + 1)}`;
    if (!body.includes("\n")) {
      return `${src.slice(0, open)}{ modules: [${entry}], ${body.trimStart()}${src.slice(close)}`;
    }
    const indent = /\n([ \t]*)\S/.exec(body)?.[1] ?? "  ";
    return `${src.slice(0, open + 1)}\n${indent}modules: [${entry}],${src.slice(open + 1)}`;
  }

  if (src.charAt(modules) !== "[") return null;
  const end = walkBracket(src, modules);
  if (end === -1) return null;
  const inner = src.slice(modules + 1, end);
  if (inner.includes("//") || inner.includes("/*")) return null;
  if (inner.trim() === "") return `${src.slice(0, modules)}[${entry}]${src.slice(end + 1)}`;

  const last = modules + 1 + inner.trimEnd().length - 1;
  const comma = src.charAt(last) === ",";
  let added: string;
  if (inner.includes("\n")) {
    const lineStart = src.lastIndexOf("\n", last) + 1;
    const indent = /^[ \t]*/.exec(src.slice(lineStart))?.[0] ?? "";
    added = comma ? `\n${indent}${entry},` : `,\n${indent}${entry}`;
  } else {
    added = comma ? ` ${entry}` : `, ${entry}`;
  }
  return `${src.slice(0, last + 1)}${added}${src.slice(last + 1)}`;
}

/**
 * Compose `cookieyesHandle(config)` into an existing `src/hooks.server.*`: first in an existing
 * `sequence(...)`, or in a new `sequence(cookieyesHandle(config), userHandle)` that replaces a
 * `handle` declared as a const or a function. Returns null when already patched or when the file
 * has any other shape (a re-exported `handle`, a second use of the name, a multi-line import, a
 * `config` of its own), so the caller prints the manual step instead of guessing.
 */
export function patchSveltekitHooks(src: string): string | null {
  if (src.includes("cookieyesHandle")) return null;
  if (hasMultilineImport(src)) return null;
  if (/(?<![\w$.])(?:config|userHandle)\b/.test(src)) return null;
  const { quote, semi } = importStyle(src);
  const imports = [
    `import { cookieyesHandle } from ${quote}@cookieyes/sveltekit${quote}${semi}`,
    `import { config } from ${quote}./lib/cookieyes${quote}${semi}`,
  ];
  const withImports = (body: string): string => imports.reduce(insertImport, body);
  const hasSequenceImport = /^import\s*\{[^}]*\bsequence\b[^}]*\}\s*from/m.test(src);

  const inSequence = /^(export\s+const\s+handle\b[^=\n]*=\s*sequence\()/m.exec(src);
  if (inSequence) {
    if (!hasSequenceImport) return null;
    const head = inSequence[1] ?? "";
    return withImports(src.replace(head, () => `${head}cookieyesHandle(config), `));
  }

  // The existing declaration is renamed, so every other use of `handle` would point at the wrong
  // thing; only a file where it appears once is rewritten.
  if ((src.match(/(?<![\w$.])handle\b/g) ?? []).length !== 1) return null;
  const declaration = /^export\s+(const\s+handle\b|(?:async\s+)?function\s+handle\b)/m.exec(src);
  if (!declaration) return null;
  if (/\bsequence\b/.test(src) && !hasSequenceImport) return null;
  const [text = ""] = declaration;
  const renamed = src.replace(text, () =>
    text.replace(/^export\s+/, "").replace(/handle\b/, "userHandle"),
  );
  const sequenceImport = hasSequenceImport
    ? []
    : [`import { sequence } from ${quote}@sveltejs/kit/hooks${quote}${semi}`];
  const body = [...sequenceImport, ...imports].reduce(insertImport, renamed);
  return `${body.trimEnd()}\n\nexport const handle = sequence(cookieyesHandle(config), userHandle)${semi}\n`;
}

/**
 * Wrap the page content of a SvelteKit root layout in `<CookieYesRoot>`: import it and the shared
 * config, take `data` from `$props()` and replace the one `{@render children()}`. With `withState`
 * false (a build with no server, so no `loadConsent`) the root gets no `state` and `data` is left
 * alone. Returns null when already patched or when the layout has no instance script, no
 * destructured `$props()` with `children` (a plain type name such as `LayoutProps` after it is
 * fine), or not exactly one `{@render children()}`, so the caller prints the manual step.
 */
export function patchSveltekitLayout(src: string, withState: boolean): string | null {
  if (src.includes("CookieYesRoot")) return null;
  const scripts = [...src.matchAll(/(<script\b([^>]*)>)([\s\S]*?)(<\/script\b[^>]*>)/gi)];
  const script = scripts.find((m) => !/\b(?:module|context\s*=)/.test(m[2] ?? ""));
  if (!script) return null;
  const [whole, open = "", , body = "", close = ""] = script;
  if (/^[ \t]*import\s*(?:type\s+)?[\w$]*\s*,?\s*\{[^}\n]*$/m.test(body)) return null;
  if (/(?<![\w$.])(?:CookieYesRoot|config)\b/.test(body)) return null;

  const props = /(let\s*\{)([^}]*)(\}\s*(?::\s*[\w$.]+\s*)?=\s*\$props\(\))/.exec(body);
  if (!props) return null;
  const names = (props[2] ?? "").split(",").map((n) => n.trim().split(/[\s:=]/)[0]);
  if (!names.includes("children")) return null;
  const needsData = withState && !names.includes("data");
  const patchedProps = needsData ? ` data,${props[2]}` : (props[2] ?? "");

  const markup = src.slice(src.indexOf(whole) + whole.length);
  const render = [...markup.matchAll(/^([ \t]*)(\{@render children(?:\?\.)?\(\)\})[ \t]*$/gm)];
  if (render.length !== 1 || (markup.match(/\{@render children/g) ?? []).length !== 1) return null;
  const [line = "", indent = "", call = ""] = render[0] ?? [];

  const imports = [...body.matchAll(/^([ \t]*)import\s.+$/gm)];
  const last = imports[imports.length - 1];
  const { quote, semi } = importStyle(last?.[0].trim() ?? "");
  const importLines = [
    `import { CookieYesRoot } from ${quote}@cookieyes/sveltekit${quote}${semi}`,
    `import { config } from ${quote}../lib/cookieyes${quote}${semi}`,
  ];
  const withProps = body.replace(props[0], () => `${props[1]}${patchedProps}${props[3]}`);
  const lead = last?.[1] ?? "  ";
  const newBody = last
    ? `${withProps.slice(0, last.index + last[0].length)}\n${importLines.map((l) => `${lead}${l}`).join("\n")}${withProps.slice(last.index + last[0].length)}`
    : `\n${importLines.map((l) => `  ${l}`).join("\n")}${withProps.startsWith("\n") ? withProps : `\n${withProps}`}`;

  const root = `<CookieYesRoot {config}${withState ? " state={data.consent}" : ""}>`;
  const wrapped = [`${indent}${root}`, `${indent}  ${call}`, `${indent}</CookieYesRoot>`].join(
    "\n",
  );
  const withScript = src.replace(whole, () => `${open}${newBody}${close}`);
  return withScript.replace(line, () => wrapped);
}

/** An import to add to a config file: `clause` is `cookieyes` or `{ es }`. */
export type ImportSpec = { clause: string; from: string };

/**
 * Add `cookieyes({...})` to the `integrations` array of `defineConfig({...})` in an
 * `astro.config.*`, creating the array when the config has none, and add the imports `imports`
 * names. `entry` renders the call for the indentation it will sit at. Returns null when the
 * package is already there, and also when the file has a shape where an edit could be wrong: no
 * single `defineConfig({`, a spread that may hold its own `integrations`, an `integrations` that
 * is not an array literal, a comment inside the array, a body on one line, a multi-line import or
 * a `cookieyes` name already in use. The caller then prints the manual step.
 */
export function patchAstroConfig(
  src: string,
  entry: (indent: string) => string,
  imports: readonly ImportSpec[],
): string | null {
  if (src.includes("@cookieyes/astro")) return null;
  if (hasMultilineImport(src)) return null;
  if (/(?<![\w$.])cookieyes\b/.test(src)) return null;
  const calls = [...src.matchAll(/\bdefineConfig\s*\(\s*\{/g)];
  const call = calls[0];
  if (calls.length !== 1 || call === undefined) return null;
  const open = call.index + call[0].length - 1;
  const indentAt = (at: number): string =>
    /^[ \t]*/.exec(src.slice(src.lastIndexOf("\n", at - 1) + 1))?.[0] ?? "";

  let key = -1;
  let spread = false;
  // The last character seen directly in the object, past comments: a key follows `{` or `,`.
  let prev = "{";
  const close = walkBracket(src, open, (i) => {
    if (src.startsWith("...", i)) spread = true;
    const found = /^integrations\s*:\s*/.exec(src.slice(i, i + 40));
    if (found && (prev === "{" || prev === ",")) key = i;
    if (/\S/.test(src.charAt(i))) prev = src.charAt(i);
  });
  if (close === -1 || spread) return null;

  let patched: string;
  if (key === -1) {
    // A nested `integrations:` is left to the developer rather than risk a top-level twin.
    if (/\bintegrations\s*:/.test(src.slice(open, close))) return null;
    const body = src.slice(open + 1, close);
    const outer = indentAt(open);
    const inner = body.trim() === "" ? `${outer}  ` : (/\n([ \t]*)\S/.exec(body)?.[1] ?? "");
    if (inner === "" || (body.trim() !== "" && !body.includes("\n"))) return null;
    const array = `integrations: [\n${inner}  ${entry(`${inner}  `)},\n${inner}],`;
    patched =
      body.trim() === ""
        ? `${src.slice(0, open + 1)}\n${inner}${array}\n${outer}${src.slice(close)}`
        : `${src.slice(0, open + 1)}\n${inner}${array}${src.slice(open + 1)}`;
  } else {
    const at = key + (/^integrations\s*:\s*/.exec(src.slice(key, key + 40))?.[0].length ?? 0);
    if (src.charAt(at) !== "[") return null;
    const end = walkBracket(src, at);
    if (end === -1) return null;
    const items = src.slice(at + 1, end);
    if (items.includes("//") || items.includes("/*")) return null;
    const keyIndent = indentAt(key);
    if (items.trim() === "" || !items.includes("\n")) {
      const existing = items.trim().replace(/,$/, "");
      const lines = [...(existing === "" ? [] : [`${keyIndent}  ${existing},`])];
      lines.push(`${keyIndent}  ${entry(`${keyIndent}  `)},`);
      patched = `${src.slice(0, at)}[\n${lines.join("\n")}\n${keyIndent}]${src.slice(end + 1)}`;
    } else {
      const last = at + 1 + items.trimEnd().length - 1;
      const indent = indentAt(last);
      const added =
        src.charAt(last) === "," ? `\n${indent}${entry(indent)},` : `,\n${indent}${entry(indent)}`;
      patched = `${src.slice(0, last + 1)}${added}${src.slice(last + 1)}`;
    }
  }

  const { quote, semi } = importStyle(src);
  return imports
    .map((i) => `import ${i.clause} from ${quote}${i.from}${quote}${semi}`)
    .reduce(insertImport, patched);
}

/**
 * Render `<CookieYesRoot />` first in the `<body>` of an Astro layout and import it in the
 * frontmatter, creating the frontmatter when the layout has none. Returns null when the layout
 * already uses it, and also when it has no single `<body>` tag, a multi-line import in its
 * frontmatter, or a `CookieYesRoot` name of its own, so the caller prints the manual step.
 */
export function patchAstroLayout(src: string): string | null {
  if (src.includes("CookieYesRoot")) return null;
  const bodies = [...src.matchAll(/<body\b(?:[^>{}]|\{[^{}]*\})*>/g)];
  const body = bodies[0];
  if (bodies.length !== 1 || body === undefined) return null;

  const indent = /^[ \t]*/.exec(src.slice(src.lastIndexOf("\n", body.index - 1) + 1))?.[0] ?? "";
  const at = body.index + body[0].length;
  // The first child's own indentation, so a layout indented with tabs, as Astro's starter is,
  // keeps them.
  const child = /^\r?\n([ \t]*)\S/.exec(src.slice(at))?.[1] ?? "";
  const root = child.length > indent.length ? child : `${indent}  `;
  const withRoot = `${src.slice(0, at)}\n${root}<CookieYesRoot />${src.slice(at)}`;
  const importLine = (quote: string, semi: string) =>
    `import { CookieYesRoot } from ${quote}@cookieyes/astro/components${quote}${semi}`;

  const fence = /^(---[ \t]*\r?\n)([\s\S]*?)(\r?\n?---[ \t]*(?:\r?\n|$))/.exec(withRoot);
  if (!fence) return `---\n${importLine('"', ";")}\n---\n${withRoot}`;
  const [whole = "", open = "", frontmatter = "", close = ""] = fence;
  if (hasMultilineImport(frontmatter)) return null;
  const { quote, semi } = importStyle(frontmatter);
  const added = /^import\s.+$/m.test(frontmatter)
    ? insertImport(frontmatter, importLine(quote, semi))
    : `${importLine(quote, semi)}\n${frontmatter}`;
  return `${open}${added}${close}${withRoot.slice(whole.length)}`;
}
