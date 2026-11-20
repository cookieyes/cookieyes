// What a visitor sees before any script runs: the page carries only the server-rendered banner
// and `critical.css` inlined in a <style>, as the first-paint snippet in the docs does. Then the
// app hydrates it and the banner must not move.
//
// The HTML is rendered in Node by a plugin in `vitest.browser.config.ts`, since a browser cannot
// render on a server.

import SERVER_HTML from "virtual:server-banner";
import critical from "@cookieyes/ui/critical.css?raw";
import { hydrate, tick, unmount } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import SsrPage from "./fixtures/SsrPage.svelte";

afterEach(() => {
  document.head.querySelector("style[data-test]")?.remove();
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
  document.getElementById("cookieyes-portal-root")?.remove();
  document.body.innerHTML = "";
});

function box(el: Element): [number, number, number, number] {
  const r = el.getBoundingClientRect();
  return [r.left, r.top, r.width, r.height];
}

describe("the first-paint markup, with no script running", () => {
  it("shows the banner styled, fixed in place, with its announcer hidden, and keeps it there after hydration", async () => {
    const style = document.createElement("style");
    style.setAttribute("data-test", "");
    style.textContent = critical as string;
    document.head.appendChild(style);

    const host = document.createElement("div");
    host.innerHTML = SERVER_HTML;
    document.body.append(host);
    // Page content beside the app's container, which hydration must leave alone.
    document.body.insertAdjacentHTML("beforeend", '<main style="height:2000px"></main>');

    const card = document.querySelector<HTMLElement>("[data-cky-banner]");
    expect(card).not.toBeNull();
    // Fixed, so it takes no room in the page's flow: no layout shift when it appears or when
    // the app later takes it over.
    expect(getComputedStyle(card as HTMLElement).position).toBe("fixed");
    // Past the 0.2 s entry fade.
    await new Promise((r) => setTimeout(r, 400));
    expect(getComputedStyle(card as HTMLElement).opacity).toBe("1");
    const before = box(card as HTMLElement);
    expect(before[3]).toBeGreaterThan(40);
    expect(before[1] + before[3]).toBeLessThanOrEqual(window.innerHeight);
    const accept = card?.querySelector<HTMLElement>('[data-cy-part="accept-all"]');
    expect(accept?.getBoundingClientRect().width).toBeGreaterThan(0);
    const live = document.querySelector<HTMLElement>('[aria-live="assertive"]');
    expect(live?.getBoundingClientRect().width).toBeLessThanOrEqual(1);

    const app = hydrate(SsrPage, {
      target: host,
      props: { spec: { regulation: "GDPR", parts: ["banner"] } },
    });
    for (let i = 0; i < 4; i++) await tick();
    await new Promise((r) => setTimeout(r, 400));

    const hydrated = document.querySelector<HTMLElement>("[data-cky-banner]");
    expect(hydrated).toBe(card);
    expect(box(hydrated as HTMLElement)).toEqual(before);
    await unmount(app);
  });
});
