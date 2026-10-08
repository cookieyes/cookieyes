/**
 * Watches the page for third-party scripts, iframes and requests, and for
 * cookies and localStorage keys, recording when each was first seen. It only
 * observes; deciding what is managed or loaded too early is `classify.ts`'s
 * job, so the same observations can feed another consumer later (the shared
 * "find what the SDK doesn't manage" capability this is meant to become).
 *
 * Framework-free on purpose: no React, no SDK imports.
 */

/** What kind of thing was observed. */
export type ObservationKind = "script" | "iframe" | "request" | "cookie" | "storage";

/** One thing seen on the page, merged across every time it was seen. */
export type Observation = {
  /** Stable identity: the kind plus a URL without its query, a host, or a name. */
  key: string;
  kind: ObservationKind;
  /** Scripts and iframes: the URL without query or hash. Requests: host and first path segment. Cookies and storage: the name. */
  label: string;
  /** The first full URL seen (scripts, iframes, requests). */
  url?: string | undefined;
  /** Epoch ms of the first sighting. For a request, when it started, not when it was noticed. */
  firstSeen: number;
  /** Requests to this host, or sightings of this script. */
  count: number;
  /** Cookies and storage keys: still there at the last check. */
  present: boolean;
  /** An iframe the SDK's `blockIframes` holds back (`data-cy-src`), with its category. */
  blockedIframeCategory?: string | undefined;
  /** A `blockIframes` iframe that hasn't been given its `src` yet, so nothing has loaded. */
  held?: boolean | undefined;
};

export type CollectorOptions = {
  /** Called (at most once per animation-ish tick) after observations change. */
  onChange: () => void;
  /** How often to re-read cookies and localStorage, in ms. */
  pollInterval?: number | undefined;
};

export type Collector = {
  start(): void;
  stop(): void;
  /** Re-read the DOM, the resource timeline, cookies and storage now. */
  rescan(): void;
  /**
   * Re-read cookies and storage now, recording anything new as first seen no
   * later than `existedBy`. Call it when consent changes, with a time just
   * before the change: whatever is there already was set before it.
   */
  syncStores(existedBy: number): void;
  /** Every observation so far, in first-seen order. */
  list(): Observation[];
};

// Two-letter second-level labels under a country code, so "shop.example.co.uk"
// compares as "example.co.uk", not "co.uk". A heuristic, not the public suffix
// list; a dev tool can afford to be roughly right here.
const SECOND_LEVEL = new Set(["co", "com", "org", "net", "gov", "ac", "edu", "ne", "or"]);

function siteOf(hostname: string): string {
  const labels = hostname.split(".");
  if (labels.length <= 2) return hostname;
  const tld = labels[labels.length - 1] ?? "";
  const sld = labels[labels.length - 2] ?? "";
  const keep = tld.length === 2 && SECOND_LEVEL.has(sld) ? 3 : 2;
  return labels.slice(-keep).join(".");
}

/**
 * When the page started loading, on the `Date.now()` clock everything else in
 * the scanner uses. `performance.timeOrigin` is on a clock that drifts from it.
 */
export function pageStartedAt(): number {
  return Math.round(Date.now() - performance.now());
}

/** True for an http(s) URL on another site than the page. */
export function isThirdParty(url: URL, pageHost: string): boolean {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.hostname === pageHost) return false;
  return siteOf(url.hostname) !== siteOf(pageHost);
}

function parse(raw: string | null | undefined): URL | undefined {
  if (!raw) return undefined;
  try {
    return new URL(raw, document.baseURI);
  } catch {
    return undefined;
  }
}

function withoutQuery(url: URL): string {
  return `${url.origin}${url.pathname}`;
}

function cookieNames(): string[] {
  try {
    return document.cookie
      .split(";")
      .map((part) => part.split("=")[0]?.trim() ?? "")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function storageKeys(): string[] {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key !== null) keys.push(key);
    }
    return keys;
  } catch {
    return [];
  }
}

/**
 * The slice of the Cookie Store API used here (Chrome and Edge ship it;
 * Firefox and Safari fall back to polling). Declared locally: not every
 * TypeScript DOM lib this package builds against has it yet.
 */
type CookieChangeEventLike = Event & {
  changed?: readonly { name?: string | undefined }[];
  deleted?: readonly { name?: string | undefined }[];
};
type CookieStoreLike = EventTarget;

/** Starts nothing until `start()`; safe to create during render. */
export function createCollector({ onChange, pollInterval = 2000 }: CollectorOptions): Collector {
  const observations = new Map<string, Observation>();
  let mutationObserver: MutationObserver | undefined;
  let performanceObserver: PerformanceObserver | undefined;
  let poll: ReturnType<typeof setInterval> | undefined;
  let cookieStore: CookieStoreLike | undefined;
  let notifyQueued = false;

  function notify(): void {
    if (notifyQueued) return;
    notifyQueued = true;
    setTimeout(() => {
      notifyQueued = false;
      onChange();
    }, 0);
  }

  function record(next: Omit<Observation, "count" | "present"> & { present?: boolean }): void {
    const existing = observations.get(next.key);
    if (!existing) {
      observations.set(next.key, { count: 1, present: true, ...next });
      notify();
      return;
    }
    let changed = false;
    if (existing.held && !next.held) {
      // Released by the SDK: it loads now, so that's when it was first really seen.
      existing.held = false;
      existing.firstSeen = next.firstSeen;
      changed = true;
    } else if (next.firstSeen < existing.firstSeen) {
      existing.firstSeen = next.firstSeen;
      changed = true;
    }
    if (next.present !== undefined && next.present !== existing.present) {
      existing.present = next.present;
      changed = true;
    }
    if (next.blockedIframeCategory && !existing.blockedIframeCategory) {
      existing.blockedIframeCategory = next.blockedIframeCategory;
      changed = true;
    }
    if (changed) notify();
  }

  function recordElement(el: Element, seenAt: number): void {
    const tag = el.tagName;
    if (tag === "SCRIPT") {
      const url = parse(el.getAttribute("src"));
      if (!url || !isThirdParty(url, location.hostname)) return;
      const label = withoutQuery(url);
      record({ key: `script:${label}`, kind: "script", label, url: url.href, firstSeen: seenAt });
    } else if (tag === "IFRAME") {
      const blocked = el.getAttribute("data-cy-category") ?? undefined;
      const src = el.getAttribute("src");
      const url = parse(src || el.getAttribute("data-cy-src"));
      if (!url || !isThirdParty(url, location.hostname)) return;
      const label = withoutQuery(url);
      record({
        key: `iframe:${label}`,
        kind: "iframe",
        label,
        url: url.href,
        firstSeen: seenAt,
        blockedIframeCategory: blocked,
        held: !src,
      });
    }
  }

  function recordResource(entry: PerformanceResourceTiming): void {
    const url = parse(entry.name);
    if (!url || !isThirdParty(url, location.hostname)) return;
    // On the wall clock that consent grants use (`Date.now()`), via the offset
    // between the two clocks right now. `timeOrigin + startTime` drifts from
    // `Date.now()` over a long session or after sleep, enough to put a script
    // loaded just after Accept before the grant.
    const startedAt = Math.round(Date.now() - (performance.now() - entry.startTime));
    if (entry.initiatorType === "script" || entry.initiatorType === "iframe") {
      const kind = entry.initiatorType;
      const label = withoutQuery(url);
      record({ key: `${kind}:${label}`, kind, label, url: url.href, firstSeen: startedAt });
      return;
    }
    // Grouped by host and first path segment: one host can serve several
    // vendors (google.com carries reCAPTCHA, Maps and Ads pings), and a
    // per-host group would take whichever came first as the vendor for all.
    const segment = url.pathname.split("/")[1] ?? "";
    const label = segment ? `${url.hostname}/${segment}` : url.hostname;
    const key = `request:${label}`;
    const existing = observations.get(key);
    if (existing) {
      existing.count += 1;
      if (startedAt < existing.firstSeen) existing.firstSeen = startedAt;
      notify();
      return;
    }
    record({ key, kind: "request", label, url: url.href, firstSeen: startedAt });
  }

  function scanDom(): void {
    const now = Date.now();
    for (const el of document.querySelectorAll("script[src], iframe")) recordElement(el, now);
  }

  function scanResources(): void {
    if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") {
      return;
    }
    for (const entry of performance.getEntriesByType("resource")) {
      recordResource(entry as PerformanceResourceTiming);
    }
  }

  function scanStores(existedBy?: number): void {
    const now = Date.now();
    // Only a name seen for the first time is back-dated; `record` keeps the
    // earliest time, so passing it for a known name would rewrite its history.
    const newSince = existedBy === undefined ? now : Math.min(existedBy, now);
    const sources: [ObservationKind, string[]][] = [
      ["cookie", cookieNames()],
      ["storage", storageKeys()],
    ];
    for (const [kind, names] of sources) {
      const current = new Set(names);
      for (const name of current) {
        const key = `${kind}:${name}`;
        const firstSeen = observations.has(key) ? now : newSince;
        record({ key, kind, label: name, firstSeen, present: true });
      }
      for (const obs of observations.values()) {
        if (obs.kind === kind && obs.present && !current.has(obs.label)) {
          obs.present = false;
          notify();
        }
      }
    }
  }

  // Exact timing where the browser reports cookie changes, instead of up to a
  // poll interval late: a cookie noticed late could look like it was set after
  // consent when it was set before.
  function onCookieChange(event: Event): void {
    const { changed = [], deleted = [] } = event as CookieChangeEventLike;
    const now = Date.now();
    for (const cookie of changed) {
      if (!cookie.name) continue;
      record({
        key: `cookie:${cookie.name}`,
        kind: "cookie",
        label: cookie.name,
        firstSeen: now,
        present: true,
      });
    }
    for (const cookie of deleted) {
      const obs = cookie.name ? observations.get(`cookie:${cookie.name}`) : undefined;
      if (obs?.present) {
        obs.present = false;
        notify();
      }
    }
  }

  function rescan(): void {
    if (typeof document === "undefined") return;
    scanDom();
    scanResources();
    scanStores();
  }

  return {
    start() {
      if (typeof document === "undefined" || poll !== undefined) return;
      rescan();
      if (typeof MutationObserver !== "undefined") {
        mutationObserver = new MutationObserver((mutations) => {
          const now = Date.now();
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (!(node instanceof Element)) continue;
              recordElement(node, now);
              // A client-side route change adds whole subtrees; a held
              // data-cy-src iframe inside one makes no request to notice it by.
              for (const el of node.querySelectorAll("script[src], iframe")) recordElement(el, now);
            }
            if (mutation.type === "attributes" && mutation.target instanceof Element) {
              recordElement(mutation.target, now);
            }
          }
        });
        mutationObserver.observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["src", "data-cy-src"],
        });
      }
      if (
        typeof PerformanceObserver !== "undefined" &&
        PerformanceObserver.supportedEntryTypes?.includes("resource")
      ) {
        performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) recordResource(entry as PerformanceResourceTiming);
        });
        performanceObserver.observe({ type: "resource", buffered: true });
      }
      // Wrapped: some browsers pass a "lateness" argument to interval callbacks.
      poll = setInterval(() => scanStores(), pollInterval);
      const store = (globalThis as { cookieStore?: CookieStoreLike }).cookieStore;
      if (store && typeof store.addEventListener === "function") {
        cookieStore = store;
        cookieStore.addEventListener("change", onCookieChange);
      }
    },
    stop() {
      mutationObserver?.disconnect();
      performanceObserver?.disconnect();
      if (poll !== undefined) clearInterval(poll);
      cookieStore?.removeEventListener("change", onCookieChange);
      cookieStore = undefined;
      mutationObserver = undefined;
      performanceObserver = undefined;
      poll = undefined;
    },
    rescan,
    syncStores(existedBy) {
      if (typeof document !== "undefined") scanStores(existedBy);
    },
    list() {
      return [...observations.values()].sort((a, b) => a.firstSeen - b.firstSeen);
    },
  };
}
