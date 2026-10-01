import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { blockIframes } from "../iframes.js";
import { createConsentManager } from "../manager.js";

const VIDEO = "https://www.youtube-nocookie.com/embed/abc";

function addIframe(attributes: Record<string, string>): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  for (const [name, value] of Object.entries(attributes)) iframe.setAttribute(name, value);
  document.body.append(iframe);
  return iframe;
}

const addVideo = (category = "functional") =>
  addIframe({ "data-cy-src": VIDEO, "data-cy-category": category });

/** MutationObserver callbacks run as a microtask. */
const settle = () => Promise.resolve();

let stop: () => void = () => undefined;

beforeEach(() => {
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
  document.body.innerHTML = "";
});

afterEach(() => {
  stop();
  vi.restoreAllMocks();
});

describe("blockIframes", () => {
  it("loads nothing before consent", () => {
    const iframe = addVideo();
    stop = blockIframes(createConsentManager({ regulation: "GDPR" }));
    expect(iframe.hasAttribute("src")).toBe(false);
  });

  it("loads an iframe once its category is accepted", () => {
    const iframe = addVideo();
    const manager = createConsentManager({ regulation: "GDPR" });
    stop = blockIframes(manager);
    manager.acceptSelected(["functional"]);
    expect(iframe.getAttribute("src")).toBe(VIDEO);
  });

  it("keeps iframes of other categories blocked", () => {
    const iframe = addVideo("advertisement");
    const manager = createConsentManager({ regulation: "GDPR" });
    stop = blockIframes(manager);
    manager.acceptSelected(["functional"]);
    expect(iframe.hasAttribute("src")).toBe(false);
  });

  it("ignores a switch that was not saved", () => {
    const iframe = addVideo();
    const manager = createConsentManager({ regulation: "GDPR" });
    stop = blockIframes(manager);
    manager.updateCategory("functional", true);
    expect(iframe.hasAttribute("src")).toBe(false);
  });

  it("unloads when consent is withdrawn, and loads again when it is given back", () => {
    const iframe = addVideo();
    const manager = createConsentManager({ regulation: "GDPR" });
    stop = blockIframes(manager);
    manager.acceptAll();
    manager.rejectAll();
    expect(iframe.hasAttribute("src")).toBe(false);
    expect(iframe.dataset.cySrc).toBe(VIDEO);
    manager.acceptAll();
    expect(iframe.getAttribute("src")).toBe(VIDEO);
  });

  it("loads at once for a visitor who already accepted", () => {
    const manager = createConsentManager({ regulation: "GDPR" });
    manager.acceptAll();
    const iframe = addVideo();
    stop = blockIframes(manager);
    expect(iframe.getAttribute("src")).toBe(VIDEO);
  });

  it("gates iframes added after it started", async () => {
    const manager = createConsentManager({ regulation: "GDPR" });
    manager.acceptAll();
    stop = blockIframes(manager);
    const nested = document.createElement("div");
    nested.innerHTML = `<iframe data-cy-src="${VIDEO}" data-cy-category="functional"></iframe>`;
    document.body.append(nested);
    await settle();
    expect(nested.querySelector("iframe")?.getAttribute("src")).toBe(VIDEO);
  });

  it("follows a data-cy-src set later", async () => {
    const manager = createConsentManager({ regulation: "GDPR" });
    manager.acceptAll();
    const iframe = addIframe({ "data-cy-category": "functional" });
    stop = blockIframes(manager);
    iframe.dataset.cySrc = VIDEO;
    await settle();
    expect(iframe.getAttribute("src")).toBe(VIDEO);
  });

  it("stops an iframe given a plain src until consent, and warns", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const manager = createConsentManager({ regulation: "GDPR" });
    stop = blockIframes(manager);
    const iframe = addIframe({ src: VIDEO, "data-cy-category": "functional" });
    await settle();
    expect(iframe.hasAttribute("src")).toBe(false);
    expect(iframe.dataset.cySrc).toBe(VIDEO);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("data-cy-src instead"));
    manager.acceptAll();
    expect(iframe.getAttribute("src")).toBe(VIDEO);
  });

  it("keeps a plain src that is already allowed", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const manager = createConsentManager({ regulation: "GDPR" });
    manager.acceptAll();
    const iframe = addIframe({ src: VIDEO, "data-cy-category": "functional" });
    stop = blockIframes(manager);
    expect(iframe.getAttribute("src")).toBe(VIDEO);
    manager.rejectAll();
    expect(iframe.hasAttribute("src")).toBe(false);
  });

  it("warns once about a category that is not configured", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    addVideo("videos");
    addVideo("videos");
    const manager = createConsentManager({ regulation: "GDPR" });
    stop = blockIframes(manager);
    manager.acceptAll();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('data-cy-category="videos"'));
  });

  it("stops reacting to consent and new iframes once stopped", async () => {
    const iframe = addVideo();
    const manager = createConsentManager({ regulation: "GDPR" });
    manager.acceptAll();
    blockIframes(manager)();
    manager.rejectAll();
    expect(iframe.getAttribute("src")).toBe(VIDEO);
    const later = addIframe({ src: VIDEO, "data-cy-category": "functional" });
    await settle();
    expect(later.getAttribute("src")).toBe(VIDEO);
  });

  it("leaves iframes without data-cy-category alone", () => {
    const iframe = addIframe({ src: VIDEO });
    stop = blockIframes(createConsentManager({ regulation: "GDPR" }));
    expect(iframe.getAttribute("src")).toBe(VIDEO);
  });
});
