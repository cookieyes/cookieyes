// What a visitor sees before any script runs: the page carries only
// `renderShell`'s HTML and `critical.css` inlined in a <style>, as the
// first-paint snippet in the docs does. Nothing from the SDK executes here.
// @ts-expect-error: Vite's `?raw` suffix has no type declarations here.
import critical from "@cookieyes/ui/critical.css?raw";
import { afterEach, describe, expect, it } from "vitest";
import { renderShell } from "../shell.js";

afterEach(() => {
  document.head.querySelector("style[data-test]")?.remove();
  document.body.innerHTML = "";
});

describe("the first-paint snippet, with no script running", () => {
  it("shows the banner styled, fixed in place, with its announcer hidden", async () => {
    const style = document.createElement("style");
    style.setAttribute("data-test", "");
    style.textContent = critical as string;
    document.head.appendChild(style);
    document.body.innerHTML = `${renderShell({ mode: "cookie-only", regulation: "GDPR" })}<main style="height:2000px"></main>`;

    const card = document.querySelector<HTMLElement>("[data-cky-banner]");
    expect(card).not.toBeNull();
    // Fixed, so it takes no room in the page's flow: no layout shift when it
    // appears or when the script later takes it over.
    expect(getComputedStyle(card as HTMLElement).position).toBe("fixed");
    // Past the 0.2 s entry fade.
    await new Promise((r) => setTimeout(r, 400));
    expect(getComputedStyle(card as HTMLElement).opacity).toBe("1");
    const box = (card as HTMLElement).getBoundingClientRect();
    expect(box.height).toBeGreaterThan(40);
    expect(box.bottom).toBeLessThanOrEqual(window.innerHeight);

    const accept = card?.querySelector<HTMLElement>('[data-cy-part="accept-all"]');
    expect(accept?.getBoundingClientRect().width).toBeGreaterThan(0);

    const live = document.querySelector<HTMLElement>('[aria-live="assertive"]');
    expect(live?.getBoundingClientRect().width).toBeLessThanOrEqual(1);
  });
});
