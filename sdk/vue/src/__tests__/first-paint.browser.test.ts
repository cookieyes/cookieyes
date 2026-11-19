// What a visitor sees before any script runs: the page carries only the server-rendered banner
// and `critical.css` inlined in a <style>, as the first-paint snippet in the docs does. Then the
// app hydrates it and the banner must not move.
import critical from "@cookieyes/ui/critical.css?raw";
import { afterEach, describe, expect, it } from "vitest";
import { createSSRApp, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import { CookieYes } from "../plugin.js";
import { CookieBanner } from "../presets/CookieBanner.js";
import { resetCookieYes } from "../runtime.js";

afterEach(() => {
  document.head.querySelector("style[data-test]")?.remove();
  resetCookieYes();
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

    const config = { mode: "cookie-only", regulation: "GDPR" } as const;
    const serverApp = createSSRApp(CookieBanner);
    serverApp.use(CookieYes, config);
    const html = await renderToString(serverApp);
    resetCookieYes();
    const host = document.createElement("div");
    host.innerHTML = html;
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

    const app = createSSRApp(CookieBanner);
    app.use(CookieYes, config);
    app.mount(host);
    for (let i = 0; i < 4; i++) await nextTick();
    await new Promise((r) => setTimeout(r, 400));
    const hydrated = document.querySelector<HTMLElement>("[data-cky-banner]");
    expect(hydrated).toBe(card);
    expect(box(hydrated as HTMLElement)).toEqual(before);
    app.unmount();
  });
});
