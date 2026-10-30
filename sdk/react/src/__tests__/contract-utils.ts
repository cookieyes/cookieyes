/// <reference types="node" />
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fireEvent } from "@testing-library/react";
import { expect } from "vitest";

/** One element of a recorded tree: its tag, every attribute, and its children. */
export type ContractNode = {
  tag: string;
  attrs?: Record<string, string>;
  children?: ContractChild[];
};

/** A recorded child: an element, or a run of visible text. */
export type ContractChild = ContractNode | string;

// A path, not a `URL`: under jsdom the global `URL` is jsdom's, which `node:fs` rejects.
const CONTRACT_DIR = join(dirname(fileURLToPath(import.meta.url)), "__contract__");

// Attributes that point at an id. React's `useId` values change with render
// order and React version, so they are renamed to `id-1`, `id-2`, ... and every
// reference is renamed to match, keeping the link without pinning the value.
const ID_REFS = ["aria-labelledby", "aria-describedby", "aria-controls", "for"];

/** Renames generated ids in recording order. Ids we choose (`cy-*`, `cookieyes-*`) are kept. */
export class IdNames {
  private readonly names = new Map<string, string>();

  name(value: string): string {
    if (/^(cy-|cookieyes-)/.test(value)) return value;
    let named = this.names.get(value);
    if (!named) {
      named = `id-${this.names.size + 1}`;
      this.names.set(value, named);
    }
    return named;
  }
}

function attrsOf(
  el: Element,
  ids: IdNames,
  keepPaths: boolean,
): Record<string, string> | undefined {
  const names = el.getAttributeNames().sort();
  if (names.length === 0) return undefined;
  const out: Record<string, string> = {};
  for (const name of names) {
    const value = el.getAttribute(name) ?? "";
    if (name === "id") out[name] = ids.name(value);
    else if (ID_REFS.includes(name))
      out[name] = value
        .split(/\s+/)
        .map((v) => ids.name(v))
        .join(" ");
    else if (name === "d" && !keepPaths) out[name] = "(path data)";
    else out[name] = value;
  }
  return out;
}

/**
 * Records a DOM subtree as plain data. Text is whitespace-collapsed and empty
 * text is dropped, so the recording changes only when what a visitor or a
 * stylesheet can observe changes. Icon path data is masked unless `keepPaths`
 * is set, which the React-against-`ui` comparison uses to check icons too.
 */
export function serialize(node: Node, ids: IdNames, keepPaths = false): ContractChild | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    return text ? text : null;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  const out: ContractNode = { tag: el.tagName.toLowerCase() };
  const attrs = attrsOf(el, ids, keepPaths);
  if (attrs) out.attrs = attrs;
  const children = serializeChildren(el, ids, keepPaths);
  if (children.length > 0) out.children = children;
  return out;
}

function serializeChildren(parent: Node, ids: IdNames, keepPaths = false): ContractChild[] {
  const out: ContractChild[] = [];
  for (const child of Array.from(parent.childNodes)) {
    const s = serialize(child, ids, keepPaths);
    if (s !== null) out.push(s);
  }
  return out;
}

/**
 * Records everything the components put in `<body>`. Testing Library's own
 * wrapper `<div>` is not part of the output, so its children are recorded in
 * its place.
 */
export function serializeBody(
  testContainer: Element,
  ids: IdNames = new IdNames(),
): ContractChild[] {
  const out: ContractChild[] = [];
  for (const child of Array.from(document.body.childNodes)) {
    if (child === testContainer) out.push(...serializeChildren(child, ids));
    else {
      const s = serialize(child, ids);
      if (s !== null) out.push(s);
    }
  }
  return out;
}

/** A short, stable name for an element, for recording where focus is. */
export function ident(el: Element | null): string {
  if (!el || el === document.body || el === document.documentElement) return "page";
  const tag = el.tagName.toLowerCase();
  const part = el.getAttribute("data-cy-part");
  if (part) return `${tag}[data-cy-part="${part}"]`;
  const role = el.getAttribute("role");
  const own = Array.from(el.classList).filter((c) => c.startsWith("cy-"));
  const cls = own[own.length - 1];
  if (cls) return `${tag}.${cls}`;
  return role ? `${tag}[role="${role}"]` : tag;
}

/** The selector React's focus trap cycles through (`primitives/utils.ts`). */
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** The focusable elements inside `container`, in the order Tab visits them. */
export function tabOrder(container: Element): string[] {
  return Array.from(container.querySelectorAll(FOCUSABLE)).map(ident);
}

function pressTab(shiftKey: boolean): void {
  fireEvent.keyDown(document, { key: "Tab", shiftKey });
}

/**
 * Where the focus trap sends focus at each edge. A browser moves focus between
 * the middle elements itself; the trap only acts when focus is on the page
 * behind, on the dialog container, or at the first or last element.
 */
export function trapEdges(container: HTMLElement): Record<string, string> {
  const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
  const first = items[0];
  const last = items[items.length - 1];
  const result: Record<string, string> = {};
  const from = (label: string, start: () => void, shiftKey: boolean) => {
    start();
    pressTab(shiftKey);
    result[label] = ident(document.activeElement);
  };
  from("tabFromPage", () => (document.activeElement as HTMLElement | null)?.blur(), false);
  from("shiftTabFromPage", () => (document.activeElement as HTMLElement | null)?.blur(), true);
  from("tabFromLast", () => last?.focus(), false);
  from("shiftTabFromFirst", () => first?.focus(), true);
  (document.activeElement as HTMLElement | null)?.blur();
  return result;
}

/**
 * Compares `value` with the stored recording `name`. The recording only
 * changes when the test runs with `UPDATE_CONTRACT=1`, so a change to it is
 * always a reviewed edit to a committed file, never a side effect of a run.
 */
export function expectContract(name: string, value: unknown): void {
  const file = join(CONTRACT_DIR, `${name}.json`);
  if (process.env.UPDATE_CONTRACT === "1") {
    writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
    return;
  }
  let stored: unknown;
  try {
    stored = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new Error(
      `No recording for "${name}". Run UPDATE_CONTRACT=1 pnpm --filter @cookieyes/react test contract and review the new file.`,
    );
  }
  expect(JSON.parse(JSON.stringify(value)), `rendering contract "${name}" changed`).toEqual(stored);
}
