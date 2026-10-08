/**
 * A curated table of common third-party vendors, used to name what the
 * scanner finds and suggest a consent category for it. It is a starting point,
 * not a verdict: the category is the usual one for the vendor's main purpose,
 * and a site may reasonably file it elsewhere.
 *
 * Everything reads it through {@link VendorLookup}, so the CookieYes cookie
 * database can replace it later without the scanner or the panel changing.
 */

/** One vendor: where its requests go and which cookies it sets. */
export type Vendor = {
  id: string;
  name: string;
  /** The category this vendor usually belongs in. */
  category: string;
  /**
   * Hostname suffixes, optionally with a path prefix: `"hotjar.com"` matches
   * `static.hotjar.com`; `"googletagmanager.com/gtm.js"` matches only that path.
   */
  hosts: string[];
  /**
   * Cookie or storage key names it sets. A name matches exactly, or as a
   * prefix when a separator follows (`"_ga"` matches `_ga_ABC123`, not
   * `_gallery`); one ending in `*` is a plain prefix (`"_hj*"` matches `_hjid`).
   */
  cookies?: string[] | undefined;
  /** Sends no cookies or identifiers by design (still worth knowing it's there). */
  cookieless?: boolean | undefined;
  /** The `@cookieyes/scripts` preset that manages it, as a ready-to-paste call. */
  preset?: string | undefined;
  /**
   * Vendors that load each other (gtag.js sends GA's and Ads' requests), so
   * managing one makes the family's requests and cookies managed too.
   */
  family?: string | undefined;
  /**
   * Loads before consent on purpose under Google Consent Mode, which keeps it
   * cookieless until granted. Only its scripts and requests are exempt from
   * the pre-consent check, and only when the SDK manages it; cookies still count.
   */
  consentMode?: boolean | undefined;
};

/** How the scanner identifies vendors. Swap in another source by implementing this. */
export type VendorLookup = {
  byUrl(url: URL): Vendor | undefined;
  byCookie(name: string): Vendor | undefined;
};

const A = "analytics";
const AD = "advertisement";
const F = "functional";
const P = "performance";
const N = "necessary";

export const VENDORS: readonly Vendor[] = [
  // Google: path-specific rules first, so GTM and gtag.js on the same host split correctly.
  {
    id: "google-tag-manager",
    family: "google",
    consentMode: true,
    name: "Google Tag Manager",
    category: A,
    hosts: ["googletagmanager.com/gtm.js", "googletagmanager.com/ns.html"],
    preset: 'googleTagManager({ containerId: "GTM-XXXXXXX" })',
  },
  {
    id: "google-tag",
    family: "google",
    consentMode: true,
    name: "Google tag (gtag.js)",
    category: A,
    hosts: ["googletagmanager.com/gtag/js"],
    preset: 'ga4({ measurementId: "G-XXXXXXX" })',
  },
  {
    id: "google-analytics",
    family: "google",
    consentMode: true,
    name: "Google Analytics",
    category: A,
    hosts: ["google-analytics.com", "analytics.google.com"],
    cookies: ["_ga", "_gid", "_gat"],
    preset: 'ga4({ measurementId: "G-XXXXXXX" })',
  },
  {
    id: "google-ads",
    family: "google",
    consentMode: true,
    name: "Google Ads",
    category: AD,
    hosts: [
      "googleadservices.com",
      "doubleclick.net",
      "googlesyndication.com",
      "adservice.google.com",
      "google.com/pagead",
      "google.com/ads",
      "google.com/rmkt",
      "google.com/ccm",
    ],
    cookies: ["_gcl_", "IDE", "test_cookie", "__gads", "__gpi"],
    preset: 'googleAds({ conversionId: "AW-XXXXXXXXX" })',
  },
  {
    id: "recaptcha",
    name: "Google reCAPTCHA",
    category: N,
    hosts: ["google.com/recaptcha", "gstatic.com/recaptcha", "recaptcha.net"],
  },
  {
    id: "google-maps",
    name: "Google Maps",
    category: F,
    hosts: ["maps.googleapis.com", "maps.google.com", "google.com/maps", "maps.gstatic.com"],
  },
  {
    id: "google-fonts",
    name: "Google Fonts",
    category: F,
    hosts: ["fonts.googleapis.com", "fonts.gstatic.com"],
    cookieless: true,
  },
  {
    id: "youtube",
    name: "YouTube",
    category: AD,
    hosts: ["youtube.com", "youtube-nocookie.com", "ytimg.com", "youtu.be"],
    cookies: ["YSC", "VISITOR_INFO1_LIVE", "VISITOR_PRIVACY_METADATA"],
  },

  // Analytics and session recording.
  {
    id: "clarity",
    name: "Microsoft Clarity",
    category: A,
    hosts: ["clarity.ms"],
    cookies: ["_clck", "_clsk", "CLID"],
    preset: 'clarity({ projectId: "xxxxxxxxxx" })',
  },
  {
    id: "hotjar",
    name: "Hotjar",
    category: A,
    hosts: ["hotjar.com", "hotjar.io"],
    cookies: ["_hj*"],
  },
  {
    id: "posthog",
    name: "PostHog",
    category: A,
    hosts: ["posthog.com"],
    cookies: ["ph_"],
    preset: 'posthog({ apiKey: "phc_…", onReject: "stop" })',
  },
  {
    id: "segment",
    name: "Segment",
    category: A,
    hosts: ["segment.com", "segment.io"],
    cookies: ["ajs_"],
    preset: 'segment({ writeKey: "…" })',
  },
  {
    id: "mixpanel",
    name: "Mixpanel",
    category: A,
    hosts: ["mixpanel.com", "mxpnl.com"],
    cookies: ["mp_"],
  },
  {
    id: "amplitude",
    name: "Amplitude",
    category: A,
    hosts: ["amplitude.com"],
    cookies: ["AMP_", "amp_"],
  },
  {
    id: "heap",
    name: "Heap",
    category: A,
    hosts: ["heap.io", "heapanalytics.com"],
    cookies: ["_hp2_"],
  },
  {
    id: "fullstory",
    name: "FullStory",
    category: A,
    hosts: ["fullstory.com"],
    cookies: ["fs_uid", "fs_lua"],
  },
  { id: "matomo", name: "Matomo", category: A, hosts: ["matomo.cloud"], cookies: ["_pk_"] },
  { id: "plausible", name: "Plausible", category: A, hosts: ["plausible.io"], cookieless: true },
  { id: "fathom", name: "Fathom", category: A, hosts: ["usefathom.com"], cookieless: true },
  {
    id: "vercel-analytics",
    name: "Vercel Analytics",
    category: A,
    hosts: ["va.vercel-scripts.com"],
    cookieless: true,
  },
  {
    id: "cloudflare-analytics",
    name: "Cloudflare Web Analytics",
    category: A,
    hosts: ["cloudflareinsights.com"],
    cookieless: true,
  },
  {
    id: "adobe-analytics",
    name: "Adobe Analytics",
    category: A,
    hosts: ["omtrdc.net", "2o7.net", "adobedtm.com"],
    cookies: ["s_cc", "s_sq", "s_vi", "AMCV_", "AMCVS_"],
  },
  {
    id: "yandex-metrica",
    name: "Yandex Metrica",
    category: A,
    hosts: ["mc.yandex.ru", "mc.yandex.com"],
    cookies: ["_ym_"],
  },
  { id: "mouseflow", name: "Mouseflow", category: A, hosts: ["mouseflow.com"], cookies: ["mf_"] },
  {
    id: "lucky-orange",
    name: "Lucky Orange",
    category: A,
    hosts: ["luckyorange.com", "luckyorange.net"],
    cookies: ["_lo_"],
  },
  { id: "crazy-egg", name: "Crazy Egg", category: A, hosts: ["crazyegg.com"], cookies: ["_ce."] },
  { id: "smartlook", name: "Smartlook", category: A, hosts: ["smartlook.com", "smartlook.cloud"] },
  {
    id: "logrocket",
    name: "LogRocket",
    category: A,
    hosts: ["logrocket.com", "lr-ingest.io", "lr-in-prod.com"],
  },
  { id: "pendo", name: "Pendo", category: A, hosts: ["pendo.io"], cookies: ["_pendo_"] },
  {
    id: "optimizely",
    name: "Optimizely",
    category: A,
    hosts: ["optimizely.com"],
    cookies: ["optimizely*"],
  },
  {
    id: "vwo",
    name: "VWO",
    category: A,
    hosts: ["visualwebsiteoptimizer.com", "vwo.com"],
    cookies: ["_vwo", "_vis_opt_"],
  },
  {
    id: "vimeo",
    name: "Vimeo",
    category: A,
    hosts: ["vimeo.com", "vimeocdn.com"],
    cookies: ["vuid"],
  },
  { id: "wistia", name: "Wistia", category: A, hosts: ["wistia.com", "wistia.net"] },
  {
    id: "hubspot",
    name: "HubSpot",
    category: A,
    hosts: ["hs-scripts.com", "hs-analytics.net", "hs-banner.com", "hsforms.net", "hubspot.com"],
    cookies: ["__hstc", "__hssc", "__hssrc", "hubspotutk"],
  },

  // Performance and error monitoring.
  { id: "sentry", name: "Sentry", category: P, hosts: ["sentry.io", "sentry-cdn.com"] },
  {
    id: "datadog",
    name: "Datadog RUM",
    category: P,
    hosts: ["datadoghq-browser-agent.com", "datadoghq.com", "datadoghq.eu"],
    cookies: ["_dd_s"],
  },
  { id: "new-relic", name: "New Relic", category: P, hosts: ["newrelic.com", "nr-data.net"] },

  // Advertising and marketing.
  {
    id: "meta-pixel",
    name: "Meta Pixel",
    category: AD,
    hosts: ["connect.facebook.net", "facebook.com/tr"],
    cookies: ["_fbp", "_fbc"],
    preset: 'metaPixel({ pixelId: "000000000000000" })',
  },
  {
    id: "microsoft-ads",
    name: "Microsoft Advertising (UET)",
    category: AD,
    hosts: ["bat.bing.com"],
    cookies: ["_uetsid", "_uetvid", "MUID"],
  },
  {
    id: "linkedin",
    name: "LinkedIn Insight Tag",
    category: AD,
    hosts: ["snap.licdn.com", "px.ads.linkedin.com"],
    cookies: ["li_fat_id", "bcookie", "lidc", "li_sugr"],
  },
  {
    id: "tiktok",
    name: "TikTok Pixel",
    category: AD,
    hosts: ["analytics.tiktok.com"],
    cookies: ["_ttp"],
  },
  {
    id: "x-ads",
    name: "X (Twitter) Ads",
    category: AD,
    hosts: ["ads-twitter.com", "analytics.twitter.com", "t.co"],
    cookies: ["muc_ads", "personalization_id"],
  },
  {
    id: "pinterest",
    name: "Pinterest Tag",
    category: AD,
    hosts: ["s.pinimg.com/ct", "ct.pinterest.com"],
    cookies: ["_pin_unauth", "_pinterest_"],
  },
  {
    id: "snap",
    name: "Snap Pixel",
    category: AD,
    hosts: ["sc-static.net", "tr.snapchat.com"],
    cookies: ["_scid"],
  },
  {
    id: "reddit",
    name: "Reddit Pixel",
    category: AD,
    hosts: ["redditstatic.com", "alb.reddit.com"],
    cookies: ["_rdt_uuid"],
  },
  { id: "quora", name: "Quora Pixel", category: AD, hosts: ["q.quora.com"] },
  {
    id: "criteo",
    name: "Criteo",
    category: AD,
    hosts: ["criteo.com", "criteo.net"],
    cookies: ["cto_"],
  },
  { id: "taboola", name: "Taboola", category: AD, hosts: ["taboola.com"] },
  { id: "outbrain", name: "Outbrain", category: AD, hosts: ["outbrain.com"] },
  { id: "amazon-ads", name: "Amazon Ads", category: AD, hosts: ["amazon-adsystem.com"] },
  { id: "adroll", name: "AdRoll", category: AD, hosts: ["adroll.com"], cookies: ["__adroll"] },
  { id: "trade-desk", name: "The Trade Desk", category: AD, hosts: ["adsrvr.org"] },
  {
    id: "yahoo-ads",
    name: "Yahoo Advertising",
    category: AD,
    hosts: ["analytics.yahoo.com", "ads.yahoo.com"],
  },
  {
    id: "marketo",
    name: "Marketo",
    category: AD,
    hosts: ["marketo.net", "mktoresp.com"],
    cookies: ["_mkto_trk"],
  },
  {
    id: "pardot",
    name: "Salesforce Pardot",
    category: AD,
    hosts: ["pardot.com"],
    cookies: ["visitor_id*"],
  },
  { id: "klaviyo", name: "Klaviyo", category: AD, hosts: ["klaviyo.com"], cookies: ["__kla_id"] },
  {
    id: "mailchimp",
    name: "Mailchimp",
    category: AD,
    hosts: ["chimpstatic.com", "list-manage.com"],
  },
  { id: "addthis", name: "AddThis", category: AD, hosts: ["addthis.com"] },
  { id: "sharethis", name: "ShareThis", category: AD, hosts: ["sharethis.com"] },
  { id: "x-embed", name: "X (Twitter) embed", category: AD, hosts: ["platform.twitter.com"] },
  { id: "instagram", name: "Instagram embed", category: AD, hosts: ["instagram.com"] },

  // Functional: chat, scheduling, forms, media and comments.
  {
    id: "intercom",
    name: "Intercom",
    category: F,
    hosts: ["intercom.io", "intercomcdn.com"],
    cookies: ["intercom-"],
  },
  { id: "zendesk", name: "Zendesk", category: F, hosts: ["zdassets.com", "zendesk.com"] },
  { id: "drift", name: "Drift", category: F, hosts: ["driftt.com", "drift.com"] },
  { id: "crisp", name: "Crisp", category: F, hosts: ["crisp.chat"], cookies: ["crisp-client*"] },
  {
    id: "tawk",
    name: "Tawk.to",
    category: F,
    hosts: ["tawk.to"],
    cookies: ["TawkConnectionTime", "__tawkuuid"],
  },
  { id: "livechat", name: "LiveChat", category: F, hosts: ["livechatinc.com"] },
  { id: "tidio", name: "Tidio", category: F, hosts: ["tidio.co"] },
  { id: "calendly", name: "Calendly", category: F, hosts: ["calendly.com"] },
  { id: "typeform", name: "Typeform", category: F, hosts: ["typeform.com"] },
  { id: "spotify", name: "Spotify embed", category: F, hosts: ["open.spotify.com"] },
  { id: "soundcloud", name: "SoundCloud", category: F, hosts: ["soundcloud.com"] },
  { id: "disqus", name: "Disqus", category: F, hosts: ["disqus.com", "disquscdn.com"] },

  // Strictly necessary: this SDK, payments and bot protection.
  {
    id: "cookieyes",
    name: "CookieYes",
    category: N,
    hosts: ["cookieyes.com", "cdn-cookieyes.com"],
    cookies: ["cookieyes-", "cky-", "cyd:", "__cyd_"],
  },
  {
    id: "stripe",
    name: "Stripe",
    category: N,
    hosts: ["stripe.com", "stripe.network"],
    cookies: ["__stripe_mid", "__stripe_sid"],
  },
  { id: "paypal", name: "PayPal", category: N, hosts: ["paypal.com", "paypalobjects.com"] },
  { id: "hcaptcha", name: "hCaptcha", category: N, hosts: ["hcaptcha.com"] },
  {
    id: "turnstile",
    name: "Cloudflare Turnstile",
    category: N,
    hosts: ["challenges.cloudflare.com"],
  },
];

type Rule = { host: string; path: string; vendor: Vendor };

/** Builds a {@link VendorLookup} over a vendor list (the curated one by default). */
export function createVendorLookup(vendors: readonly Vendor[] = VENDORS): VendorLookup {
  const rules: Rule[] = [];
  const cookieRules: { name: string; wildcard: boolean; vendor: Vendor }[] = [];
  for (const vendor of vendors) {
    for (const entry of vendor.hosts) {
      const slash = entry.indexOf("/");
      rules.push(
        slash === -1
          ? { host: entry, path: "", vendor }
          : { host: entry.slice(0, slash), path: entry.slice(slash), vendor },
      );
    }
    for (const entry of vendor.cookies ?? []) {
      const wildcard = entry.endsWith("*");
      cookieRules.push({ name: wildcard ? entry.slice(0, -1) : entry, wildcard, vendor });
    }
  }
  // Most specific first: a path rule beats a bare host, a longer host beats a shorter one.
  rules.sort((a, b) => b.path.length - a.path.length || b.host.length - a.host.length);
  cookieRules.sort((a, b) => b.name.length - a.name.length);

  return {
    byUrl(url) {
      // Google serves the same endpoints from country domains (google.co.in,
      // google.de); match them as google.com.
      const host = url.hostname
        .replace(/^www\./, "")
        .replace(/^google\.(?:com?\.)?[a-z]{2,3}$/, "google.com");
      return rules.find(
        (r) =>
          (host === r.host || host.endsWith(`.${r.host}`)) &&
          (r.path === "" || url.pathname.startsWith(r.path)),
      )?.vendor;
    },
    byCookie(name) {
      return cookieRules.find((r) => {
        if (name === r.name) return true;
        if (!name.startsWith(r.name)) return false;
        // Guessing wrong here names a vendor for a site's own cookie, so a
        // bare prefix only counts when the name ends in, or is followed by, a separator.
        return r.wildcard || /[_\-.:]$/.test(r.name) || /^[_\-.:]/.test(name.slice(r.name.length));
      })?.vendor;
    },
  };
}
