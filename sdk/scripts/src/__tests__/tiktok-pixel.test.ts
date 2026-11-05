import { type IntegrationHost, type RegionDecision, runIntegrations } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tiktokIdentify, tiktokPage, tiktokPixel, tiktokTrack } from "../tiktok-pixel.js";

const REGION: RegionDecision = {
  region: undefined,
  regulation: "DEFAULT",
  source: "manual",
  confidence: "high",
};
const CCPA: RegionDecision = { ...REGION, region: "US-CA", regulation: "CCPA" };

function makeHost(initial: Record<string, boolean> = {}, region: RegionDecision = REGION) {
  const consent: Record<string, boolean> = { ...initial };
  const subs = new Set<() => void>();
  const host: IntegrationHost = {
    granted: (c) => consent[c] === true,
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    region,
  };
  return {
    host,
    set(category: string, value: boolean) {
      consent[category] = value;
      for (const fn of [...subs]) fn();
    },
  };
}

/** The queue: an array of `[method, ...args]` entries plus the pixel registration. */
type TtqQueue = unknown[][] & {
  _i?: Record<string, unknown[]>;
  _o?: Record<string, Record<string, unknown>>;
  _t?: Record<string, number>;
};
type TtqWindow = { ttq?: TtqQueue | undefined; TiktokAnalyticsObject?: string | undefined };
const w = () => window as unknown as TtqWindow;

const PIXEL = "C1234567890ABCDEFGHI";
const CONFIG = { pixelId: PIXEL };
const SRC = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${PIXEL}&lib=ttq`;
const flush = () => new Promise((r) => setTimeout(r, 0));
const el = () => document.getElementById("cky-tiktok-pixel") as HTMLScriptElement | null;
const fireLoad = () => el()?.dispatchEvent(new Event("load"));
const fireError = () => el()?.dispatchEvent(new Event("error"));
const queue = () => w().ttq as TtqQueue;
/** The queued calls alone, without the registration properties the array also carries. */
const pushed = () => [...queue()];
const lastPush = () => queue()[queue().length - 1];
const options = () => queue()._o?.[PIXEL];
const cookieNames = () =>
  document.cookie
    .split(";")
    .map((c) => c.split("=")[0]?.trim())
    .filter(Boolean);

/** Grant, load the script and settle the engine: the pixel is active. */
async function loaded(region: RegionDecision = REGION) {
  const made = makeHost({ advertisement: true }, region);
  const runner = runIntegrations([tiktokPixel(CONFIG)], made.host);
  await flush();
  fireLoad();
  await flush();
  return { ...made, runner };
}

beforeEach(() => {
  document.head.innerHTML = "";
  for (const name of cookieNames()) document.cookie = `${name}=; max-age=0; path=/`;
  sessionStorage.clear();
  w().ttq = undefined;
  w().TiktokAnalyticsObject = undefined;
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("tiktokPixel()", () => {
  it("loads nothing until consent", async () => {
    const { host } = makeHost();
    runIntegrations([tiktokPixel(CONFIG)], host);
    await flush();
    expect(el()).toBeNull();
    expect(w().ttq).toBeUndefined();
    expect(cookieNames()).toEqual([]);
  });

  it("on grant builds the queue, signals consent, queues the page view and loads events.js once (loading → active)", async () => {
    const { host, set } = makeHost();
    const runner = runIntegrations([tiktokPixel(CONFIG)], host);
    set("advertisement", true);
    await flush();
    expect(w().TiktokAnalyticsObject).toBe("ttq");
    expect(pushed()).toEqual([["grantConsent"], ["page"]]);
    expect(queue()._i?.[PIXEL]).toHaveLength(0);
    expect(options()).toEqual({});
    expect(typeof queue()._t?.[PIXEL]).toBe("number");
    expect(el()?.src).toBe(SRC);
    expect(runner.status()["tiktok-pixel"]).toBe("loading");

    fireLoad();
    await flush();
    expect(runner.status()["tiktok-pixel"]).toBe("active");
    expect(document.querySelectorAll("#cky-tiktok-pixel")).toHaveLength(1);
  });

  it("on withdrawal revokes consent, disables cookies and clears the pixel's cookies and storage", async () => {
    const { runner, set } = await loaded();
    for (const name of [
      "_ttp",
      "_tt_enable_cookie",
      "ttcsid",
      `ttcsid_${PIXEL}`,
      "ttclid",
      "keep",
    ]) {
      document.cookie = `${name}=x; path=/`;
    }
    for (const key of ["tt_sessionId", "tt_pixel_session_index", "tt_appInfo", "tt_adInfo"]) {
      sessionStorage.setItem(key, "x");
    }
    sessionStorage.setItem("keep", "x");

    set("advertisement", false);
    expect(runner.status()["tiktok-pixel"]).toBe("silenced");
    expect(queue().slice(-2)).toEqual([["revokeConsent"], ["disableCookie"]]);
    expect(cookieNames()).toEqual(["keep"]);
    expect(Object.keys(sessionStorage)).toEqual(["keep"]);
  });

  it("on re-grant signals consent again on the same pixel, with no second script", async () => {
    const { runner, set } = await loaded();
    set("advertisement", false);
    set("advertisement", true);
    await flush();
    expect(runner.status()["tiktok-pixel"]).toBe("active");
    expect(lastPush()).toEqual(["grantConsent"]);
    expect(document.querySelectorAll("#cky-tiktok-pixel")).toHaveLength(1);
  });

  it("trims the pixel id and honours autoPageView, trackHistoryChanges, category and id", async () => {
    const { host } = makeHost({ ads: true });
    const runner = runIntegrations(
      [
        tiktokPixel({
          pixelId: `  ${PIXEL}  `,
          autoPageView: false,
          trackHistoryChanges: false,
          category: "ads",
          id: "tt-2",
        }),
      ],
      host,
    );
    await flush();
    expect(runner.status()["tt-2"]).toBe("loading");
    expect(el()?.src).toBe(SRC);
    expect(pushed()).toEqual([["grantConsent"]]);
    expect(options()).toEqual({ historyObserver: false });
  });

  it("turns Limited Data Use on for a CCPA visitor and lets limitedDataUse override it", async () => {
    await loaded(CCPA);
    expect(options()).toEqual({ limited_data_use: true });

    w().ttq = undefined;
    document.head.innerHTML = "";
    const forcedOff = makeHost({ advertisement: true }, CCPA);
    runIntegrations([tiktokPixel({ ...CONFIG, limitedDataUse: false })], forcedOff.host);
    await flush();
    expect(options()).toEqual({});

    w().ttq = undefined;
    document.head.innerHTML = "";
    const forcedOn = makeHost({ advertisement: true });
    runIntegrations([tiktokPixel({ ...CONFIG, limitedDataUse: true })], forcedOn.host);
    await flush();
    expect(options()).toEqual({ limited_data_use: true });
  });

  it("logs one error and loads nothing for an empty pixel id", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { host } = makeHost({ advertisement: true });
    runIntegrations([tiktokPixel({ pixelId: "  " })], host);
    await flush();
    expect(error).toHaveBeenCalledTimes(1);
    expect(el()).toBeNull();
    expect(w().ttq).toBeUndefined();
  });

  it("marks error on load failure, drops the queue and retries on the next grant", async () => {
    const { host, set } = makeHost({ advertisement: true });
    const runner = runIntegrations([tiktokPixel(CONFIG)], host);
    await flush();
    fireError();
    await flush();
    expect(runner.status()["tiktok-pixel"]).toBe("error");
    expect(el()).toBeNull();
    expect(w().ttq).toBeUndefined();

    set("advertisement", false);
    set("advertisement", true);
    await flush();
    expect(el()?.src).toBe(SRC);
    expect(pushed()).toEqual([["grantConsent"], ["page"]]);
    expect(runner.status()["tiktok-pixel"]).toBe("loading");
  });

  it("after a restart, tells a pixel already on the page that consent is granted again", async () => {
    const { host, runner } = await loaded();
    runner.stop();
    expect(lastPush()).toEqual(["disableCookie"]);

    const second = runIntegrations([tiktokPixel(CONFIG)], host);
    await flush();
    expect(second.status()["tiktok-pixel"]).toBe("active");
    expect(lastPush()).toEqual(["grantConsent"]);
    expect(document.querySelectorAll("#cky-tiktok-pixel")).toHaveLength(1);
  });

  it("resolves setup without touching the DOM when there is no window", async () => {
    vi.stubGlobal("window", undefined);
    const { host } = makeHost({ advertisement: true });
    const runner = runIntegrations([tiktokPixel(CONFIG)], host);
    await flush();
    expect(runner.status()["tiktok-pixel"]).toBe("active");
    vi.unstubAllGlobals();
    expect(el()).toBeNull();
  });
});

describe("tiktokTrack(), tiktokPage() and tiktokIdentify()", () => {
  it("do nothing before the pixel is on the page, with one warning in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    tiktokTrack("AddToCart", { value: 1, currency: "USD" });
    tiktokPage();
    tiktokIdentify({ email: "jane@example.com" });
    expect(w().ttq).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("are dropped while consent is withdrawn and work again after a re-grant", async () => {
    const { set } = await loaded();
    set("advertisement", false);
    const before = queue().length;
    tiktokTrack("ViewContent");
    tiktokPage();
    expect(queue()).toHaveLength(before);

    set("advertisement", true);
    tiktokPage();
    expect(lastPush()).toEqual(["page"]);
  });

  it("push the pixel's own calls, with event_id and TikTok's identify keys", async () => {
    await loaded();
    tiktokTrack("CompletePayment", { value: 10, currency: "USD" }, { eventId: "order-1" });
    expect(lastPush()).toEqual([
      "track",
      "CompletePayment",
      { value: 10, currency: "USD" },
      { event_id: "order-1" },
    ]);
    tiktokTrack("NewsletterOpened");
    expect(lastPush()).toEqual(["track", "NewsletterOpened", {}, {}]);
    tiktokPage();
    expect(lastPush()).toEqual(["page"]);
    tiktokIdentify({ email: "jane@example.com", phoneNumber: "+15551234567", externalId: "u-42" });
    expect(lastPush()).toEqual([
      "identify",
      { email: "jane@example.com", phone_number: "+15551234567", external_id: "u-42" },
    ]);
    tiktokIdentify({ email: "jane@example.com" });
    expect(lastPush()).toEqual(["identify", { email: "jane@example.com" }]);
  });
});
