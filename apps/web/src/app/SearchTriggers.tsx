"use client";

import { useSearchContext } from "fumadocs-ui/contexts/search";
import { useEffect } from "react";

/** Elements in the ported design markup that should open search when clicked. */
const TRIGGER_SELECTOR = "[data-nav-search], [data-menu-search]";

/**
 * Makes the landing page's search affordances open the docs search dialog.
 *
 * The nav and mobile-menu markup is ported verbatim from the design file, where the
 * triggers carry `onClick="{{ openSearch }}"` bindings that have no meaning outside
 * the design tool — so on our page they were inert `<div>`s. Those files are marked
 * "re-port rather than diverging", so rather than editing them this listens for
 * clicks on the same data attributes the design already stamps on the elements.
 *
 * ⌘K is not handled here: RootProvider binds it globally, so it already worked on
 * this page before the click handler existed.
 */
export function SearchTriggers() {
  const { setOpenSearch, enabled } = useSearchContext();

  useEffect(() => {
    if (!enabled) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(TRIGGER_SELECTOR)) return;

      event.preventDefault();
      setOpenSearch(true);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [enabled, setOpenSearch]);

  useEffect(() => {
    if (!enabled) return;

    // The ported triggers are plain divs. Give them button semantics so they are
    // reachable and operable from the keyboard, without touching the design port.
    const nodes = document.querySelectorAll<HTMLElement>(TRIGGER_SELECTOR);
    for (const node of nodes) {
      node.setAttribute("role", "button");
      node.setAttribute("tabindex", "0");
      if (!node.hasAttribute("aria-label")) node.setAttribute("aria-label", "Search docs");
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(TRIGGER_SELECTOR)) return;

      event.preventDefault();
      setOpenSearch(true);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled, setOpenSearch]);

  return null;
}
