import type { ConsentCategory } from "./types.js";

export type NetworkBlockerRule = {
  id: string;
  domain: string;
  pathIncludes?: string | undefined;
  methods?: string[] | undefined;
  category: ConsentCategory;
};

export type BlockedRequestInfo = {
  rule: NetworkBlockerRule;
  url: string;
  method: string;
};

export type NetworkBlockerConfig = {
  rules: NetworkBlockerRule[];
  onRequestBlocked?: ((info: BlockedRequestInfo) => void) | undefined;
  logBlockedRequests?: boolean | undefined;
};

type ConsentChecker = (category: ConsentCategory) => boolean;

function findBlockingRule(
  rules: NetworkBlockerRule[],
  url: string,
  method: string,
  hasConsent: ConsentChecker,
): NetworkBlockerRule | null {
  let parsed: URL;
  try {
    const base = typeof window !== "undefined" ? window.location.href : "http://localhost";
    parsed = new URL(url, base);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname + parsed.search;
  const upperMethod = method.toUpperCase();

  for (const rule of rules) {
    const ruleHost = rule.domain.toLowerCase();
    if (host !== ruleHost && !host.endsWith("." + ruleHost)) continue;
    if (rule.pathIncludes && !path.includes(rule.pathIncludes)) continue;
    if (rule.methods && !rule.methods.map((m) => m.toUpperCase()).includes(upperMethod)) {
      continue;
    }
    if (hasConsent(rule.category)) continue;
    return rule;
  }
  return null;
}

type InstallationState = {
  originalFetch: typeof fetch;
  originalXhrOpen: typeof XMLHttpRequest.prototype.open;
  originalXhrSend: typeof XMLHttpRequest.prototype.send;
  originalSendBeacon: typeof navigator.sendBeacon | undefined;
};

let active: InstallationState | null = null;

export function installNetworkBlocker(
  config: NetworkBlockerConfig,
  hasConsent: ConsentChecker,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  if (active) return () => undefined;
  if (!config.rules.length) return () => undefined;

  const state: InstallationState = {
    originalFetch: window.fetch,
    originalXhrOpen: XMLHttpRequest.prototype.open,
    originalXhrSend: XMLHttpRequest.prototype.send,
    // `navigator.sendBeacon` is how GA4, Meta, and others fire exit/unload
    // tracking — fetch/XHR interception alone misses it, so patch it too.
    // Store the raw reference (not bound) so uninstall restores it exactly.
    originalSendBeacon:
      typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function"
        ? navigator.sendBeacon
        : undefined,
  };
  active = state;

  const logBlocked = config.logBlockedRequests !== false;
  function notify(info: BlockedRequestInfo): void {
    if (logBlocked) {
      // eslint-disable-next-line no-console
      console.warn(
        `[cookieyes] blocked ${info.method} ${info.url} (rule "${info.rule.id}", category: ${info.rule.category})`,
      );
    }
    config.onRequestBlocked?.(info);
  }

  window.fetch = function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    let url = "";
    let method = init?.method ?? "GET";
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else {
      url = (input as Request).url;
      method = init?.method ?? (input as Request).method;
    }
    const blockingRule = findBlockingRule(config.rules, url, method, hasConsent);
    if (blockingRule) {
      notify({ rule: blockingRule, url, method });
      return Promise.reject(
        new TypeError(
          `Blocked by consent (rule: ${blockingRule.id}, category: ${blockingRule.category})`,
        ),
      );
    }
    return state.originalFetch.call(window, input, init);
  };

  type XHRMeta = { _cyUrl?: string; _cyMethod?: string };
  XMLHttpRequest.prototype.open = function patchedOpen(
    this: XMLHttpRequest & XHRMeta,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    this._cyUrl = url.toString();
    this._cyMethod = method;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return state.originalXhrOpen.apply(this, [method, url, ...rest] as any);
  };

  XMLHttpRequest.prototype.send = function patchedSend(
    this: XMLHttpRequest & XHRMeta,
    body?: Document | XMLHttpRequestBodyInit | null,
  ) {
    const url = this._cyUrl ?? "";
    const method = this._cyMethod ?? "GET";
    const blockingRule = findBlockingRule(config.rules, url, method, hasConsent);
    if (blockingRule) {
      notify({ rule: blockingRule, url, method });
      this.abort();
      return;
    }
    return state.originalXhrSend.call(this, body);
  };

  if (state.originalSendBeacon) {
    const originalSendBeacon = state.originalSendBeacon;
    navigator.sendBeacon = function patchedSendBeacon(
      url: string | URL,
      data?: BodyInit | null,
    ): boolean {
      // sendBeacon is always a POST.
      const blockingRule = findBlockingRule(config.rules, url.toString(), "POST", hasConsent);
      if (blockingRule) {
        notify({ rule: blockingRule, url: url.toString(), method: "POST" });
        // Returning true tells the caller the beacon was "queued" — nothing is
        // actually sent. Returning false makes some libraries retry via other
        // transports, which we'd then also block; true is the quieter stop.
        return true;
      }
      return originalSendBeacon.call(navigator, url, data);
    };
  }

  return uninstallNetworkBlocker;
}

export function uninstallNetworkBlocker(): void {
  if (!active) return;
  if (typeof window !== "undefined") {
    window.fetch = active.originalFetch;
    XMLHttpRequest.prototype.open = active.originalXhrOpen;
    XMLHttpRequest.prototype.send = active.originalXhrSend;
    if (active.originalSendBeacon) {
      navigator.sendBeacon = active.originalSendBeacon;
    }
  }
  active = null;
}
