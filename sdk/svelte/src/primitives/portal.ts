import { bodyPortalRoot } from "@cookieyes/ui";

/**
 * @internal Moves the element into `#cookieyes-portal-root`, a `<body>` child, once it is
 * mounted, and removes it again when its block is destroyed. Svelte has no teleport. The node
 * is kept, not recreated, so a server-rendered banner is not replaced and its entry animation
 * is not replayed (see `data-cy-entered` in `Banner/Root.svelte`). Svelte removes block content
 * with `node.remove()`, so a node that has been moved is still removed cleanly.
 */
export function portal(node: HTMLElement): { destroy: () => void } {
  bodyPortalRoot().appendChild(node);
  return {
    destroy() {
      node.remove();
    },
  };
}
