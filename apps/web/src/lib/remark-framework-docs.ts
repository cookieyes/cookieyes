/**
 * Resolves a shared docs body for the framework it is being published under.
 *
 * The docs are written once, in content/shared, and published three times, under
 * content/docs/{nextjs,react,core} (scripts/generate-framework-docs.mjs). This plugin runs
 * after `<include>` has spliced the body into its wrapper, reads the framework from the
 * wrapper's path, and does two things:
 *
 * 1. `<Framework when="nextjs react">…</Framework>` blocks are kept, unwrapped, when
 *    they name the current framework and dropped otherwise. Nothing hidden reaches the
 *    HTML, so a reader on React never receives Next.js-only advice, and copy, search and
 *    screen readers all see one page.
 *
 * 2. Inside fenced code, `@cookieyes/nextjs` and `@cookieyes/react` become the current
 *    framework's package. `@cookieyes/nextjs` re-exports the whole React surface, so for
 *    everything the two share the import is the only line that differs; that is what makes
 *    the rewrite safe. It never touches `@cookieyes/nextjs/server` or `/styles-route`,
 *    which exist in one package only, and never touches prose, where the two names are
 *    usually being compared. Under JavaScript nothing is rewritten: `@cookieyes/core` has
 *    no components, so its examples are written for it by hand, in `<Framework when="core">`.
 *
 * A fence that names a framework on purpose opts out with ```ts frameworkSwap=false.
 */

const FRAMEWORKS = ["nextjs", "react", "core"] as const;
type Framework = (typeof FRAMEWORKS)[number];

/** `content/docs/<framework>/…` — the only place wrappers live. */
const ROOT_IN_PATH = /[\\/]content[\\/]docs[\\/](nextjs|react|core)[\\/]/;

const SWAPPABLE = /@cookieyes\/(react|nextjs)(\/styles\.css|\/critical\.css)?(?![\w/-])/g;
const OPT_OUT = /(^|\s)frameworkSwap=false(\s|$)/;
const USE_CLIENT = /^"use client";\n\n?/;
const APP_DIR_TITLE = /title="app\//;

// Structural types for the few node shapes touched. The mdast and mdast-util-mdx-jsx
// typings are not dependencies of this app, and the plugin needs only this much.
interface Node {
  type: string;
  children?: Node[];
}
interface CodeNode extends Node {
  type: "code";
  value: string;
  meta?: string | null;
}
interface JsxAttribute {
  type: string;
  name?: string;
  value?: unknown;
}
interface JsxElementNode extends Node {
  type: "mdxJsxFlowElement" | "mdxJsxTextElement";
  name: string | null;
  attributes: JsxAttribute[];
  children: Node[];
}

function isCode(node: Node): node is CodeNode {
  return node.type === "code";
}

function isFrameworkBlock(node: Node): node is JsxElementNode {
  return (
    (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
    (node as JsxElementNode).name === "Framework"
  );
}

function frameworksNamed(node: JsxElementNode, where: string): Framework[] {
  const attr = node.attributes.find((a) => a.type === "mdxJsxAttribute" && a.name === "when");
  if (typeof attr?.value !== "string") {
    throw new Error(
      `${where}: <Framework> needs when="…" naming one or more of ${FRAMEWORKS.join(", ")}`,
    );
  }
  const names = attr.value.split(/\s+/).filter(Boolean);
  for (const name of names) {
    if (!(FRAMEWORKS as readonly string[]).includes(name)) {
      throw new Error(
        `${where}: <Framework when="${attr.value}"> names an unknown framework "${name}"`,
      );
    }
  }
  return names as Framework[];
}

function resolve(parent: Node, framework: Framework, where: string): void {
  if (!parent.children) return;

  const next: Node[] = [];
  for (const child of parent.children) {
    if (isFrameworkBlock(child)) {
      if (frameworksNamed(child, where).includes(framework)) {
        // Keep the contents, drop the wrapper — and resolve any block nested inside.
        resolve(child, framework, where);
        next.push(...child.children);
      }
      continue;
    }

    if (isCode(child)) {
      if (framework !== "core" && !(child.meta && OPT_OUT.test(child.meta))) {
        child.value = child.value.replace(SWAPPABLE, (_m, _pkg, suffix: string | undefined) => {
          return `@cookieyes/${framework}${suffix ?? ""}`;
        });
      }
      if (framework !== "nextjs") {
        // Two Next.js conventions the shared examples are written in: the `"use client"`
        // directive, which means nothing outside React Server Components, and the `app/`
        // directory. Neither a plain React app nor a plain JavaScript one has them.
        child.value = child.value.replace(USE_CLIENT, "");
        if (child.meta) child.meta = child.meta.replace(APP_DIR_TITLE, 'title="src/');
      }
      next.push(child);
      continue;
    }

    resolve(child, framework, where);
    next.push(child);
  }
  parent.children = next;
}

export function remarkFrameworkDocs() {
  return (tree: Node, file: { path?: string }) => {
    const match = file.path ? ROOT_IN_PATH.exec(file.path) : null;
    if (!match) return;
    resolve(tree, match[1] as Framework, file.path ?? "");
  };
}
