import { renderToDom, type UiNode } from "@cookieyes/ui";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Attributes that behaviour, not markup, puts on a component: the colour
 * scheme, a custom theme's variables, and the marker that stops an adopted
 * first-paint banner from animating in a second time. Updating the markup must
 * leave them alone.
 */
const OWNED_BY_BEHAVIOUR = new Set(["data-cy-scheme", "style", "data-cy-entered"]);

/**
 * Makes `el` match `node`, changing only what differs, and returns the element
 * now in its place. Elements that stay are kept, so the one that has focus
 * keeps it when a switch flips, the countdown ticks or the language changes.
 * Text always goes in as text.
 */
export function morph(el: Element, node: UiNode): Element {
  if (el.tagName.toLowerCase() !== node.tag) {
    const fresh = renderToDom(node, el.ownerDocument, el.namespaceURI === SVG_NS);
    el.replaceWith(fresh);
    return fresh;
  }
  const want = node.attrs ?? {};
  for (const name of el.getAttributeNames()) {
    if (!(name in want) && !OWNED_BY_BEHAVIOUR.has(name)) el.removeAttribute(name);
  }
  for (const [name, value] of Object.entries(want)) {
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  }
  const checked = node.props?.checked;
  if (checked !== undefined && (el as HTMLInputElement).checked !== checked) {
    (el as HTMLInputElement).checked = checked;
  }

  const children = node.children ?? [];
  children.forEach((child, i) => {
    const existing = el.childNodes[i];
    if (typeof child === "string") {
      if (existing?.nodeType === Node.TEXT_NODE) {
        if (existing.textContent !== child) existing.textContent = child;
      } else {
        const text = el.ownerDocument.createTextNode(child);
        if (existing) existing.replaceWith(text);
        else el.appendChild(text);
      }
    } else if (existing?.nodeType === Node.ELEMENT_NODE) {
      morph(existing as Element, child);
    } else {
      const fresh = renderToDom(child, el.ownerDocument, el.namespaceURI === SVG_NS);
      if (existing) existing.replaceWith(fresh);
      else el.appendChild(fresh);
    }
  });
  while (el.childNodes.length > children.length) el.lastChild?.remove();
  return el;
}
