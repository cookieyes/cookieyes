import type { Observation } from "./collector.js";
import type { Vendor, VendorLookup } from "./vendors.js";

/** Something the SDK said it manages (a `"s"` entry on the devtools queue). */
export type ManagedResource = {
  id: string;
  src: string;
  category?: string | string[] | undefined;
  via: string;
};

/**
 * The periods each category was granted on this page load, as `[from, to)`
 * epoch-ms pairs; an open period has no `to`. Built from the committed consent
 * as it changes. Periods, not a single first-grant time: something that loads
 * after consent was withdrawn loaded without consent too.
 */
export type ConsentTimeline = Record<string, [number, number | undefined][]>;

function grantedAt(periods: [number, number | undefined][] | undefined, at: number): boolean {
  return (periods ?? []).some(([from, to]) => from <= at && (to === undefined || at < to));
}

/**
 * - `managed`: the SDK loads or gates it.
 * - `unmanaged`: a known non-essential vendor the SDK doesn't control.
 * - `necessary`: strictly necessary (payments, bot protection, this SDK); no consent needed.
 * - `unclassified`: not in the vendor table, so no category can be suggested.
 */
export type FindingStatus = "managed" | "unmanaged" | "necessary" | "unclassified";

export type Finding = Observation & {
  status: FindingStatus;
  vendor: Vendor | undefined;
  /** The managed entry's category when there is one, else the vendor's usual category. */
  category: string | undefined;
  /** How the SDK manages it, e.g. "registerScript", "GatedFrame", "blockIframes". */
  managedBy: string | undefined;
  /** Appeared while its category wasn't granted: before consent, or after withdrawal. */
  preConsent: boolean;
  /** `preConsent`, and the category had been granted and withdrawn before it appeared. */
  loadedAfterWithdrawal: boolean;
  /** A cookie or storage key still present after its category was withdrawn. */
  afterWithdrawal: boolean;
  /** A managed Google tag loading before consent, as Consent Mode intends. */
  consentModeByDesign: boolean;
};

function hostPath(raw: string): string | undefined {
  try {
    const url = new URL(raw, typeof document === "undefined" ? undefined : document.baseURI);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return undefined;
  }
}

function categoriesOf(category: string | string[] | undefined): string[] {
  if (category === undefined) return [];
  return Array.isArray(category) ? category : [category];
}

/**
 * Decide what each observation is: managed or not, which category it
 * probably needs, and whether it showed up before that category was granted.
 *
 * Managed means its URL matches something the SDK registered, or it belongs
 * to the same vendor as something registered (GA's beacons come from a
 * managed gtag.js), or it is an iframe `blockIframes` holds back. The
 * consent check asks whether its category was granted at the moment it was
 * first seen, so it can only be as right as the category: for unmanaged items
 * that's the vendor table's suggestion, which is why the panel says "possible".
 */
export function classify(
  observations: readonly Observation[],
  managed: readonly ManagedResource[],
  timeline: ConsentTimeline,
  vendors: VendorLookup,
): Finding[] {
  const managedByPath = new Map<string, ManagedResource>();
  const managedVendors = new Map<string, ManagedResource>();
  for (const entry of managed) {
    const path = hostPath(entry.src);
    if (path) managedByPath.set(path, entry);
    const url = (() => {
      try {
        return new URL(entry.src, typeof document === "undefined" ? undefined : document.baseURI);
      } catch {
        return undefined;
      }
    })();
    const vendor = url ? vendors.byUrl(url) : undefined;
    if (vendor) managedVendors.set(vendor.family ?? vendor.id, entry);
  }

  return observations.map((obs) => {
    let vendor: Vendor | undefined;
    if (obs.kind === "cookie" || obs.kind === "storage") vendor = vendors.byCookie(obs.label);
    else if (obs.url) {
      try {
        vendor = vendors.byUrl(new URL(obs.url));
      } catch {
        vendor = undefined;
      }
    }

    let match: ManagedResource | undefined;
    if (obs.url) match = managedByPath.get(hostPath(obs.url) ?? "");
    const matchedByPath = match !== undefined;
    if (!match && vendor) match = managedVendors.get(vendor.family ?? vendor.id);

    const managedBy = obs.blockedIframeCategory ? "blockIframes" : match?.via;
    const categories = obs.blockedIframeCategory
      ? [obs.blockedIframeCategory]
      : match?.category !== undefined
        ? categoriesOf(match.category)
        : vendor
          ? [vendor.category]
          : [];
    const category = categories[0];

    const status: FindingStatus = managedBy
      ? "managed"
      : vendor?.category === "necessary"
        ? "necessary"
        : vendor
          ? "unmanaged"
          : "unclassified";

    let preConsent = false;
    let loadedAfterWithdrawal = false;
    let afterWithdrawal = false;
    const gated = categories.filter((c) => c !== "necessary");
    const isStore = obs.kind === "cookie" || obs.kind === "storage";
    // Consent Mode loads before consent on purpose, but only what the SDK itself
    // loads: the script it registered, and the pings that script sends. A
    // Google script the page hard-codes is still checked, even though the
    // SDK manages another Google tag.
    const consentModeByDesign = Boolean(
      managedBy && vendor?.consentMode && (matchedByPath || obs.kind === "request"),
    );
    // A cookie that's gone isn't a problem any more.
    const relevant = !isStore || obs.present;
    if (gated.length > 0 && !vendor?.cookieless && !obs.held && !consentModeByDesign && relevant) {
      const periods = gated.map((c) => timeline[c]);
      preConsent = !periods.every((p) => grantedAt(p, obs.firstSeen));
      loadedAfterWithdrawal =
        preConsent &&
        periods.some((p) => (p ?? []).some(([, to]) => to !== undefined && to <= obs.firstSeen));
      const grantedNow = periods.every((p) => grantedAt(p, Number.POSITIVE_INFINITY));
      afterWithdrawal = isStore && !preConsent && !grantedNow;
    }

    return {
      ...obs,
      status,
      vendor,
      category,
      managedBy,
      preConsent,
      loadedAfterWithdrawal,
      afterWithdrawal,
      consentModeByDesign,
    };
  });
}

/** Fold a new committed-consent state into the timeline, opening or closing periods. */
export function advanceTimeline(
  timeline: ConsentTimeline,
  committed: Record<string, boolean>,
  at: number,
): ConsentTimeline {
  const next: ConsentTimeline = { ...timeline };
  for (const [id, granted] of Object.entries(committed)) {
    const periods = next[id] ?? [];
    const last = periods[periods.length - 1];
    const open = last !== undefined && last[1] === undefined;
    if (granted && !open) next[id] = [...periods, [at, undefined]];
    else if (!granted && open && last) next[id] = [...periods.slice(0, -1), [last[0], at]];
  }
  return next;
}
