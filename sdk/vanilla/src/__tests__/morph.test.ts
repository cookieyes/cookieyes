import { renderToDom } from "@cookieyes/ui";
import { describe, expect, it } from "vitest";
import { morph } from "../morph.js";

describe("morph", () => {
  it("updates attributes, state and text in place, keeping the focused element", () => {
    const el = renderToDom({
      tag: "label",
      attrs: { "data-cy-state": "off" },
      children: [{ tag: "input", attrs: { type: "checkbox" }, props: { checked: false } }, "Off"],
    });
    document.body.appendChild(el);
    const input = el.querySelector("input") as HTMLInputElement;
    input.focus();
    const same = morph(el, {
      tag: "label",
      attrs: { "data-cy-state": "on" },
      children: [{ tag: "input", attrs: { type: "checkbox" }, props: { checked: true } }, "On"],
    });
    expect(same).toBe(el);
    expect(el.querySelector("input")).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.checked).toBe(true);
    expect(el.getAttribute("data-cy-state")).toBe("on");
    expect(el.textContent).toBe("On");
    el.remove();
  });

  it("replaces an element whose tag changed, and adds and drops children", () => {
    const parent = renderToDom({ tag: "div", children: [{ tag: "span" }, "a", "b"] });
    morph(parent, { tag: "div", children: [{ tag: "p", children: ["x"] }, { tag: "b" }] });
    expect(parent.innerHTML).toBe("<p>x</p><b></b>");
    const root = renderToDom({ tag: "span" });
    document.body.appendChild(root);
    const fresh = morph(root, { tag: "em" });
    expect(fresh.tagName).toBe("EM");
    expect(fresh.isConnected).toBe(true);
    fresh.remove();
  });

  it("removes attributes the markup no longer has, but not the ones behaviour set", () => {
    const el = renderToDom({ tag: "div", attrs: { class: "a", "data-x": "1" } }) as HTMLElement;
    el.setAttribute("data-cy-scheme", "dark");
    el.style.setProperty("--cy-primary", "#000");
    morph(el, { tag: "div", attrs: { class: "b" } });
    expect(el.getAttribute("class")).toBe("b");
    expect(el.hasAttribute("data-x")).toBe(false);
    expect(el.getAttribute("data-cy-scheme")).toBe("dark");
    expect(el.style.getPropertyValue("--cy-primary")).toBe("#000");
  });

  it("keeps new children inside an SVG in the SVG namespace", () => {
    const svg = renderToDom({ tag: "svg", children: [] });
    morph(svg, { tag: "svg", children: [{ tag: "path", attrs: { d: "M0 0" } }] });
    expect(svg.firstElementChild?.namespaceURI).toBe("http://www.w3.org/2000/svg");
  });
});
