import assert from "node:assert/strict";
import { describe, it } from "node:test";
import vm from "node:vm";
import { announcementGateScript } from "../announcement-gate.mjs";

const NOW = Date.UTC(2026, 9, 6);
const DAY = 24 * 60 * 60 * 1000;
const CHOSEN = "cookieyes-consent=consentid:abc,consent:no,action:yes,necessary:yes";
const UNDECIDED = "cookieyes-consent=consentid:abc,consent:no,action:,necessary:yes";

function gate(overrides = {}) {
  return {
    id: "react-0.11.0",
    expiresAt: NOW + 30 * DAY,
    linkPath: "/docs/changelog/2026-09-30",
    skipPath: "/playground/preview",
    waitForConsent: false,
    ...overrides,
  };
}

/** A fake page: storage shared across loads, so one visitor can be followed over visits. */
function createBrowser({ cookie = "", storageBlocked = false } = {}) {
  const items = new Map();
  const localStorage = {
    getItem(key) {
      if (storageBlocked) throw new Error("SecurityError");
      return items.has(key) ? items.get(key) : null;
    },
    setItem(key, value) {
      if (storageBlocked) throw new Error("SecurityError");
      items.set(key, String(value));
    },
  };

  /** Runs the script as a page load would, and reports whether the strip is shown. */
  function load(options, path = "/") {
    const attributes = new Map();
    const context = {
      document: {
        cookie,
        documentElement: { setAttribute: (name, value) => attributes.set(name, value) },
      },
      location: { pathname: path },
      localStorage,
      Date: { now: () => NOW },
    };
    vm.runInNewContext(announcementGateScript(options), context);
    return attributes.get("data-cy-ann") !== "off";
  }

  function dismiss(id) {
    localStorage.setItem(`cy-banner:${id}`, "dismissed");
  }

  return { load, dismiss, items };
}

describe("announcementGateScript", () => {
  it("shows an announcement the visitor has not dismissed", () => {
    assert.equal(createBrowser().load(gate()), true);
  });

  it("hides a dismissed announcement on the next visit", () => {
    const browser = createBrowser();
    browser.dismiss("react-0.11.0");
    assert.equal(browser.load(gate()), false);
  });

  it("shows a new announcement to someone who dismissed the previous one", () => {
    const browser = createBrowser();
    browser.dismiss("react-0.11.0");
    assert.equal(browser.load(gate({ id: "react-0.12.0" })), true);
  });

  it("keeps an announcement hidden when only its wording changes", () => {
    const browser = createBrowser();
    browser.dismiss("react-0.11.0");
    // The id is all the script knows; the message never reaches it.
    assert.equal(browser.load(gate({ id: "react-0.11.0" })), false);
  });

  it("hides an expired announcement for everyone, dismissed or not", () => {
    assert.equal(createBrowser().load(gate({ expiresAt: NOW })), false);
    assert.equal(createBrowser().load(gate({ expiresAt: NOW - DAY })), false);
  });

  it("hides on the linked page and records it as dismissed", () => {
    const browser = createBrowser();
    assert.equal(browser.load(gate(), "/docs/changelog/2026-09-30"), false);
    assert.equal(browser.load(gate(), "/"), false);
  });

  it("treats a trailing slash on the linked page as the same page", () => {
    assert.equal(createBrowser().load(gate(), "/docs/changelog/2026-09-30/"), false);
  });

  it("hides on the playground preview without recording a dismissal", () => {
    const browser = createBrowser();
    assert.equal(browser.load(gate(), "/playground/preview"), false);
    assert.equal(browser.items.size, 0);
    assert.equal(browser.load(gate(), "/"), true);
  });

  it("waits while the consent banner still needs an answer", () => {
    assert.equal(createBrowser().load(gate({ waitForConsent: true })), false);
    const undecided = createBrowser({ cookie: UNDECIDED });
    assert.equal(undecided.load(gate({ waitForConsent: true })), false);
  });

  it("shows once the visitor has made a consent choice", () => {
    const browser = createBrowser({ cookie: `_ga=1; ${CHOSEN}; theme=dark` });
    assert.equal(browser.load(gate({ waitForConsent: true })), true);
  });

  it("ignores the consent cookie when the site has no consent banner", () => {
    assert.equal(createBrowser({ cookie: UNDECIDED }).load(gate()), true);
  });

  it("still shows, without throwing, when storage is blocked", () => {
    const browser = createBrowser({ storageBlocked: true });
    assert.equal(browser.load(gate()), true);
    assert.equal(browser.load(gate(), "/docs/changelog/2026-09-30"), false);
  });

  it("still waits for consent when storage is blocked", () => {
    const browser = createBrowser({ storageBlocked: true, cookie: UNDECIDED });
    assert.equal(browser.load(gate({ waitForConsent: true })), false);
  });
});
