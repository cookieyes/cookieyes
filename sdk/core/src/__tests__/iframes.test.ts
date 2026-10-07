import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { blockIframes } from "../iframes.js";
import { getOrCreateConsentRuntime, resetConsentRuntime } from "../runtime.js";
import type { ConsentRuntime, CookieYesConfig } from "../types.js";

const VIDEO = "https://www.youtube-nocookie.com/embed/abc";

function addIframe(attributes: Record<string, string>): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  for (const [name, value] of Object.entries(attributes)) iframe.setAttribute(name, value);
  document.body.append(iframe);
  return iframe;
}

const addVideo = (category = "functional") =>
  addIframe({ "data-cy-src": VIDEO, "data-cy-category": category });

const createRuntime = (config: Partial<CookieYesConfig> = {}) =>
  getOrCreateConsentRuntime({ mode: "cookie-only", regulation: "GDPR", ...config });

let stop: () => void = () => undefined;

function startBlocking({ consentManager, consentStore }: ConsentRuntime) {
  stop = blockIframes(consentManager, consentStore);
  return consentManager;
}

/** MutationObserver callbacks run as a microtask. */
const settle = () => Promise.resolve();

const placeholderOf = (iframe: HTMLIFrameElement) => iframe.contentDocument?.body;

beforeEach(() => {
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
  document.body.innerHTML = "";
});

afterEach(() => {
  stop();
  resetConsentRuntime();
  vi.restoreAllMocks();
});

describe("blockIframes", () => {
  it("loads nothing before consent, and shows a placeholder instead", () => {
    const iframe = addVideo();
    startBlocking(createRuntime());
    expect(iframe.hasAttribute("src")).toBe(false);
    expect(iframe.hasAttribute("srcdoc")).toBe(true);
  });

  it("loads an iframe once its category is accepted", () => {
    const iframe = addVideo();
    const manager = startBlocking(createRuntime());
    manager.acceptSelected(["functional"]);
    expect(iframe.getAttribute("src")).toBe(VIDEO);
    expect(iframe.hasAttribute("srcdoc")).toBe(false);
  });

  it("keeps iframes of other categories blocked", () => {
    const iframe = addVideo("advertisement");
    const manager = startBlocking(createRuntime());
    manager.acceptSelected(["functional"]);
    expect(iframe.hasAttribute("src")).toBe(false);
  });

  it("ignores a switch that was not saved", () => {
    const iframe = addVideo();
    const manager = startBlocking(createRuntime());
    manager.updateCategory("functional", true);
    expect(iframe.hasAttribute("src")).toBe(false);
  });

  it("unloads when consent is withdrawn, and loads again when it is given back", () => {
    const iframe = addVideo();
    const manager = startBlocking(createRuntime());
    manager.acceptAll();
    manager.rejectAll();
    expect(iframe.hasAttribute("src")).toBe(false);
    expect(iframe.hasAttribute("srcdoc")).toBe(true);
    expect(iframe.dataset.cySrc).toBe(VIDEO);
    manager.acceptAll();
    expect(iframe.getAttribute("src")).toBe(VIDEO);
  });

  it("loads at once for a visitor who already accepted", () => {
    const runtime = createRuntime();
    runtime.consentManager.acceptAll();
    const iframe = addVideo();
    startBlocking(runtime);
    expect(iframe.getAttribute("src")).toBe(VIDEO);
  });

  it("gates iframes added after it started", async () => {
    const runtime = createRuntime();
    runtime.consentManager.acceptAll();
    startBlocking(runtime);
    const nested = document.createElement("div");
    nested.innerHTML = `<iframe data-cy-src="${VIDEO}" data-cy-category="functional"></iframe>`;
    document.body.append(nested);
    await settle();
    expect(nested.querySelector("iframe")?.getAttribute("src")).toBe(VIDEO);
  });

  it("follows a data-cy-src set later", async () => {
    const runtime = createRuntime();
    runtime.consentManager.acceptAll();
    const iframe = addIframe({ "data-cy-category": "functional" });
    startBlocking(runtime);
    iframe.dataset.cySrc = VIDEO;
    await settle();
    expect(iframe.getAttribute("src")).toBe(VIDEO);
  });

  it("stops an iframe given a plain src until consent, and warns", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const manager = startBlocking(createRuntime());
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
    const runtime = createRuntime();
    runtime.consentManager.acceptAll();
    const iframe = addIframe({ src: VIDEO, "data-cy-category": "functional" });
    const manager = startBlocking(runtime);
    expect(iframe.getAttribute("src")).toBe(VIDEO);
    manager.rejectAll();
    expect(iframe.hasAttribute("src")).toBe(false);
  });

  it("warns once about a category that is not configured", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    addVideo("videos");
    addVideo("videos");
    const manager = startBlocking(createRuntime());
    manager.acceptAll();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"videos"'));
  });

  it("stops reacting to consent and new iframes once stopped", async () => {
    const iframe = addVideo();
    const runtime = createRuntime();
    runtime.consentManager.acceptAll();
    startBlocking(runtime);
    stop();
    runtime.consentManager.rejectAll();
    expect(iframe.getAttribute("src")).toBe(VIDEO);
    const later = addIframe({ src: VIDEO, "data-cy-category": "functional" });
    await settle();
    expect(later.getAttribute("src")).toBe(VIDEO);
  });

  it("leaves iframes without data-cy-category alone", () => {
    const iframe = addIframe({ src: VIDEO });
    startBlocking(createRuntime());
    expect(iframe.getAttribute("src")).toBe(VIDEO);
    expect(iframe.hasAttribute("srcdoc")).toBe(false);
  });
});

describe("blockIframes placeholder", () => {
  it("names the provider and the category, and links the privacy policy", () => {
    const iframe = addVideo();
    startBlocking(createRuntime());
    const placeholder = placeholderOf(iframe);
    expect(placeholder?.querySelector("p")?.textContent).toBe(
      "This content is hosted by YouTube. Viewing it needs your consent to Functional cookies.",
    );
    expect(placeholder?.querySelector("button")?.textContent).toBe("Allow Functional cookies");
    const privacyLink = placeholder?.querySelector("a");
    expect(privacyLink?.href).toBe("https://policies.google.com/privacy");
    expect(privacyLink?.getAttribute("aria-label")).toBe(
      "YouTube privacy policy (opens in new tab)",
    );
  });

  it("allows only that category, keeping what was saved before", () => {
    const iframe = addVideo();
    const manager = startBlocking(createRuntime());
    manager.acceptSelected(["analytics"]);
    placeholderOf(iframe)?.querySelector("button")?.click();
    expect(manager.committedCategories).toMatchObject({
      functional: true,
      analytics: true,
      advertisement: false,
    });
    expect(iframe.getAttribute("src")).toBe(VIDEO);
  });

  it("uses data-cy-provider and data-cy-privacy-url, or else the host name", () => {
    const named = addIframe({
      "data-cy-src": "https://maps.example.com/embed",
      "data-cy-category": "functional",
      "data-cy-provider": "Example Maps",
      "data-cy-privacy-url": "https://example.com/privacy",
    });
    const unnamed = addIframe({
      "data-cy-src": "https://www.example.org/widget",
      "data-cy-category": "functional",
    });
    startBlocking(createRuntime());
    expect(placeholderOf(named)?.textContent).toContain("hosted by Example Maps.");
    expect(placeholderOf(named)?.querySelector("a")?.href).toBe("https://example.com/privacy");
    expect(placeholderOf(unnamed)?.textContent).toContain("hosted by example.org.");
    expect(placeholderOf(unnamed)?.querySelector("a")).toBeNull();
  });

  it("follows the active language and the configured category label", async () => {
    const iframe = addVideo();
    const runtime = createRuntime({
      categories: [
        { id: "necessary", required: true },
        { id: "functional", label: "Media" },
      ],
      i18n: {
        messages: {
          de: {
            embedPlaceholder: {
              message: "{provider}: {category}",
              allow: "{category} erlauben",
              privacyPolicy: "{provider} Datenschutz",
            },
          },
        },
      },
    });
    startBlocking(runtime);
    expect(placeholderOf(iframe)?.querySelector("button")?.textContent).toBe("Allow Media cookies");
    await runtime.consentStore.setLanguage("de");
    expect(iframe.contentDocument?.documentElement.lang).toBe("de");
    expect(placeholderOf(iframe)?.querySelector("p")?.textContent).toBe("YouTube: Media");
  });
});
