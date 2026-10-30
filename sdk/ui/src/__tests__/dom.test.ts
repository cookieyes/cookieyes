// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { crossIcon } from "../markup/icons.js";
import { renderToDom } from "../markup/node.js";

describe("renderToDom", () => {
  it("inserts text as text, never as markup", () => {
    const el = renderToDom({ tag: "p", children: ["<img src=x onerror=alert(1)>"] });
    expect(el.querySelector("img")).toBeNull();
    expect(el.textContent).toBe("<img src=x onerror=alert(1)>");
  });

  it("creates SVG elements in the SVG namespace", () => {
    const svg = renderToDom(crossIcon(9));
    expect(svg.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(svg.firstElementChild?.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(svg.firstElementChild?.getAttribute("stroke-width")).toBe("1.5");
  });

  it("applies a style through the CSSOM rather than a style attribute write", () => {
    const el = renderToDom({ tag: "span", attrs: { style: "position:absolute;width:1px" } });
    expect((el as HTMLElement).style.position).toBe("absolute");
    expect((el as HTMLElement).style.width).toBe("1px");
  });

  it("sets a checkbox's checked state as a property", () => {
    const on = renderToDom({ tag: "input", attrs: { type: "checkbox" }, props: { checked: true } });
    expect((on as HTMLInputElement).checked).toBe(true);
    expect(on.hasAttribute("checked")).toBe(false);
  });
});
