/**
 * One element of a component's markup, as plain data: the tag, its attributes
 * and its children. Every framework draws the same tree, so this is the
 * description they share. Attribute names are the HTML and SVG names
 * (`aria-label`, `stroke-width`, `viewBox`), never a framework's spelling.
 *
 * `props` holds live state that is a DOM property rather than an attribute,
 * such as whether a checkbox is ticked.
 */
export type UiNode = {
  tag: string;
  attrs?: Record<string, string> | undefined;
  props?: { checked?: boolean | undefined } | undefined;
  children?: UiChild[] | undefined;
};

/** A child of a {@link UiNode}: another element, or text. */
export type UiChild = UiNode | string;

/** Elements with no closing tag. */
const VOID = new Set(["br", "hr", "img", "input", "link", "meta"]);

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

/**
 * Renders markup to an HTML string, for a server or a static page. Every text
 * and attribute value is escaped, so a translation can never become markup.
 *
 * @example renderToString(banner({ translations, regulation: "GDPR", titleId: "cy-title" }))
 */
export function renderToString(node: UiChild | UiChild[]): string {
  if (Array.isArray(node)) return node.map(renderToString).join("");
  if (typeof node === "string") return escapeHtml(node);
  let attrs = "";
  for (const [name, value] of Object.entries(node.attrs ?? {})) {
    attrs += value === "" ? ` ${name}` : ` ${name}="${escapeHtml(value)}"`;
  }
  if (node.props?.checked) attrs += " checked";
  if (VOID.has(node.tag)) return `<${node.tag}${attrs}>`;
  return `<${node.tag}${attrs}>${renderToString(node.children ?? [])}</${node.tag}>`;
}

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Builds real elements from markup, for a page with no framework. Text goes in
 * as text nodes, never as HTML. A `style` attribute is applied through the
 * CSSOM, which a strict `style-src` Content Security Policy allows and a
 * `style="..."` attribute would not.
 */
export function renderToDom(node: UiNode, doc: Document = document, inSvg = false): Element {
  const svg = inSvg || node.tag === "svg";
  const el = svg ? doc.createElementNS(SVG_NS, node.tag) : doc.createElement(node.tag);
  for (const [name, value] of Object.entries(node.attrs ?? {})) {
    if (name === "style" && "style" in el) (el as HTMLElement).style.cssText = value;
    else el.setAttribute(name, value);
  }
  if (node.props?.checked !== undefined) (el as HTMLInputElement).checked = node.props.checked;
  for (const child of node.children ?? []) {
    el.appendChild(
      typeof child === "string" ? doc.createTextNode(child) : renderToDom(child, doc, svg),
    );
  }
  return el;
}
