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

  it("waits for the page to finish loading", () => {
    vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
    const manager = createConsentManager({ regulation: "GDPR" });
    manager.acceptAll();
    stop = blockIframes(manager);
    const iframe = addVideo();
    expect(iframe.hasAttribute("src")).toBe(false);
    document.dispatchEvent(new Event("DOMContentLoaded"));
    expect(iframe.getAttribute("src")).toBe(VIDEO);
  });

  it("stops reacting to consent once stopped", () => {
    const iframe = addVideo();
    const manager = createConsentManager({ regulation: "GDPR" });
    blockIframes(manager)();
    manager.acceptAll();
    expect(iframe.hasAttribute("src")).toBe(false);
  });

  it("leaves iframes without data-cy-src alone", () => {
    const iframe = addIframe({ src: VIDEO, "data-cy-category": "functional" });
    stop = blockIframes(createConsentManager({ regulation: "GDPR" }));
    expect(iframe.getAttribute("src")).toBe(VIDEO);
  });
});
