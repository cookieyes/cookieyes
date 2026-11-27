import type { UiNode } from "@cookieyes/ui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _mountWidget, type _SurfaceName } from "../index.js";

const GDPR = { mode: "cookie-only", regulation: "GDPR" } as const;

function clearPage(): void {
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
  document.body.innerHTML = "";
}

/** Adds `extra` to the class of every element with the given part, as an adapter's classNames do. */
function addClass(node: UiNode, part: string, extra: string): UiNode {
  const attrs =
    node.attrs?.["data-cy-part"] === part
      ? { ...node.attrs, class: `${node.attrs.class ?? ""} ${extra}`.trim() }
      : node.attrs;
  return {
    ...node,
    attrs,
    children: node.children?.map((c) => (typeof c === "string" ? c : addClass(c, part, extra))),
  };
}

async function opened(selector: string): Promise<HTMLElement> {
  return vi.waitFor(() => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`${selector} not open yet`);
    return el;
  });
}

let destroy: (() => void) | undefined;
beforeEach(clearPage);
afterEach(() => {
  destroy?.();
  destroy = undefined;
  clearPage();
});

describe("_mountWidget", () => {
  it("draws every surface when no options are given, as start does", () => {
    const widget = _mountWidget(GDPR);
    destroy = widget.destroy;
    expect(document.querySelector("[data-cky-banner]")).not.toBeNull();
  });

  it("draws only the surfaces it is given", () => {
    const widget = _mountWidget(GDPR, { surfaces: ["recall"] });
    destroy = widget.destroy;
    expect(document.querySelector("[data-cky-banner]")).toBeNull();
    widget.runtime.consentManager.rejectAll("banner");
    expect(document.querySelector('[data-cy-part="recall"]')).not.toBeNull();
  });

  it("removes a first-paint shell when the banner is not among the surfaces", () => {
    document.body.innerHTML =
      '<span aria-live="assertive" data-cy-shell></span><div class="cy-banner-wrap" data-cy-shell></div>';
    const widget = _mountWidget(GDPR, { surfaces: ["recall"] });
    destroy = widget.destroy;
    expect(document.querySelector("[data-cy-shell]")).toBeNull();
  });

  it("keeps the classes decorate adds when the markup is redrawn", async () => {
    const seen = new Set<_SurfaceName>();
    const widget = _mountWidget(GDPR, {
      decorate: (surface, node) => {
        seen.add(surface);
        return addClass(node, "accept-all", "site-accept");
      },
    });
    destroy = widget.destroy;
    const button = document.querySelector('[data-cy-part="accept-all"]');
    expect(button?.classList.contains("site-accept")).toBe(true);
    await widget.runtime.consentStore.setLanguage("fr");
    expect(document.querySelector('[data-cy-part="accept-all"]')).toBe(button);
    expect(button?.classList.contains("site-accept")).toBe(true);

    widget.openPreferences();
    const dialog = await opened('[data-cy-part="overlay"]');
    expect(dialog.querySelector('[data-cy-part="accept-all"]')?.classList).toContain("site-accept");
    expect(seen).toEqual(new Set(["banner", "preferences"]));
  });

  it("decorates the opt-out dialog, and leaves dialogs out that are not among the surfaces", async () => {
    const widget = _mountWidget(GDPR, {
      surfaces: ["banner", "optOut"],
      decorate: (surface, node) =>
        surface === "optOut" ? addClass(node, "confirm", "site-confirm") : node,
    });
    destroy = widget.destroy;
    widget.openOptOut();
    const dialog = await opened('[data-cy-part="optout"]');
    expect(dialog.querySelector('[data-cy-part="confirm"]')?.classList).toContain("site-confirm");
    widget.closeOptOut();
    expect(document.querySelector('[data-cy-part="optout"]')).toBeNull();
    widget.openPreferences();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector('[data-cy-part="overlay"] [data-cy-part="save"]')).toBeNull();
  });
});
