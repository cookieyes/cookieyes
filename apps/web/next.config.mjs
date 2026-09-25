import { createMDX } from "fumadocs-mdx/next";

/**
 * The Content-Security-Policy: every origin a page may load from. It is enforced, and the
 * browser also posts each thing it blocks to /api/csp-report, which logs it — search the
 * runtime logs for "csp-violation" to see what was stopped, and add an origin here if a
 * service the site relies on starts loading from somewhere new.
 *
 * Verified before enforcing it, with this exact policy applied to the production site: the
 * banner, its preference centre, saving and changing consent, GA4, Clarity, search, the docs
 * and the playground's config editor all ran with no violations.
 *
 * The third-party origins are the CookieYes banner (cdn, log and directory), GA4 and Google
 * Tag Manager, and Microsoft Clarity (which also beacons to c.bing.com); cdn.jsdelivr.net
 * serves the integration logos. Inline scripts stay allowed: Next.js and the Consent Mode
 * default are inline, and per-request nonces would stop pages being served from the cache.
 *
 * The playground also needs 'unsafe-eval': its config reader evaluates the edited config in
 * a sandboxed srcdoc iframe, and a srcdoc document inherits this page's policy.
 */
function contentSecurityPolicy({ allowEval = false } = {}) {
  const directives = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(allowEval ? ["'unsafe-eval'"] : []),
      "https://cdn-cookieyes.com",
      "https://www.googletagmanager.com",
      "https://*.clarity.ms",
      "https://c.bing.com",
    ],
    "style-src": ["'self'", "'unsafe-inline'", "https://cdn-cookieyes.com"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://cdn-cookieyes.com",
      "https://cdn.jsdelivr.net",
      "https://*.google-analytics.com",
      "https://*.googletagmanager.com",
      "https://*.clarity.ms",
      "https://c.bing.com",
    ],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://cdn-cookieyes.com",
      "https://log.cookieyes.com",
      "https://directory.cookieyes.com",
      "https://*.google-analytics.com",
      "https://*.analytics.google.com",
      "https://*.googletagmanager.com",
      "https://*.clarity.ms",
      "https://c.bing.com",
    ],
    "frame-src": ["'self'"],
    "frame-ancestors": ["'self'"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    // report-uri alone: every current browser supports it and posts each report at once.
    // Adding the newer report-to would make Chrome ignore report-uri and batch reports
    // through the Reporting API instead.
    "report-uri": ["/api/csp-report"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Next writes AGENTS.md / CLAUDE.md into the app on `next dev`; this app does not
  // want them checked in.
  agentRules: false,

  /**
   * The docs moved under a framework root: `/docs/<section>/…` is now
   * `/docs/{nextjs,react,core}/<section>/…`. These keep every old link working — the ones
   * in READMEs, issues and bookmarks — by sending them to the default framework, or to the
   * one a `?pkg=` link asked for. Sections that exist under one framework only still land
   * on the default; the page then offers the framework that has it.
   */
  // Only developers.cookieyes.com may be indexed. Every other host that serves this
  // build (review deployments, previews, localhost) answers with noindex, so a copy of
  // the site never competes with the real one in search results.
  async headers() {
    return [
      // Baseline hardening for every response. Framing is limited to this origin (the
      // playground embeds its own preview page); the Content-Security-Policy below says the
      // same with frame-ancestors, for production builds.
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      // Production only: the dev server's hot reload relies on eval, which this blocks.
      ...(process.env.NODE_ENV === "production"
        ? [
            {
              source: "/:path((?!playground(?:/|$)).*)",
              headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy() }],
            },
            {
              source: "/playground/:path*",
              headers: [
                {
                  key: "Content-Security-Policy",
                  value: contentSecurityPolicy({ allowEval: true }),
                },
              ],
            },
          ]
        : []),
      {
        source: "/:path*",
        missing: [{ type: "host", value: "developers\\.cookieyes\\.com" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
      // RFC 8288 Link headers for agents: every page has a Markdown form at its own URL,
      // and the docs are the service documentation for the packages.
      {
        source: "/",
        headers: [
          {
            key: "Link",
            value: '</>; rel="alternate"; type="text/markdown", </docs/nextjs>; rel="service-doc"',
          },
        ],
      },
      {
        source: "/docs/:path*",
        headers: [{ key: "Link", value: '</docs/:path*>; rel="alternate"; type="text/markdown"' }],
      },
    ];
  },

  async redirects() {
    const sections = [
      "getting-started",
      "components",
      "headless",
      "hooks",
      "styling",
      "integrations",
      "translations",
      "accessibility",
      "reopening-preferences",
      "network-blocking",
      "rendering-and-selector-contract",
      "migration",
      "troubleshooting",
    ];
    // A framework root has no page of its own: the first thing to read is how to install.
    const roots = ["nextjs", "react", "core"].map((fw) => ({
      source: `/docs/${fw}`,
      destination: `/docs/${fw}/getting-started/installation`,
      permanent: false,
    }));
    // The primitives overview was folded into the Banner page.
    const moved = ["nextjs", "react"].flatMap((fw) => [
      {
        source: `/docs/${fw}/headless/overview`,
        destination: `/docs/${fw}/headless/banner`,
        permanent: true,
      },
      {
        source: `/docs/${fw}/reopening-preferences`,
        destination: `/docs/${fw}/hooks/use-consent-actions`,
        permanent: true,
      },
      {
        source: `/docs/${fw}/rendering-and-selector-contract`,
        destination: `/docs/${fw}/styling/part-and-state-contract`,
        permanent: true,
      },
    ]);
    const byQuery = ["react", "core"].flatMap((pkg) => [
      {
        source: "/docs",
        has: [{ type: "query", key: "pkg", value: pkg }],
        destination: `/docs/${pkg}/getting-started/installation`,
        permanent: false,
      },
      ...sections.map((section) => ({
        source: `/docs/${section}/:path*`,
        has: [{ type: "query", key: "pkg", value: pkg }],
        destination: `/docs/${pkg}/${section}/:path*`,
        permanent: false,
      })),
    ]);
    const byPath = sections.map((section) => ({
      source: `/docs/${section}/:path*`,
      destination: `/docs/nextjs/${section}/:path*`,
      permanent: true,
    }));
    // Agent discovery documents that describe the CookieYes platform, not this site.
    // They are published by www.cookieyes.com; point there instead of keeping a copy.
    const parentSite = ["/.well-known/mcp/server-card.json", "/.well-known/api-catalog"].map(
      (path) => ({
        source: path,
        destination: `https://www.cookieyes.com${path}`,
        permanent: false,
      }),
    );
    // Browsers and crawlers that never read the page's <link rel="icon"> still ask for
    // /favicon.ico; the site's only icon is the SVG.
    const favicon = { source: "/favicon.ico", destination: "/icon.svg", permanent: true };
    return [...roots, ...moved, ...byQuery, ...byPath, ...parentSite, favicon];
  },

  /**
   * A miss on a file — an image, a font, a stylesheet — answers in plain text instead of
   * rendering the whole 404 page into something that only wanted bytes.
   *
   * `fallback` is the last stage of routing: real files and every route are matched first,
   * so this can never shadow something that exists.
   */
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        {
          source:
            "/:path*.:ext(css|js|mjs|map|json|xml|txt|webmanifest|png|jpg|jpeg|gif|svg|webp|avif|ico|woff|woff2|ttf|otf|mp4|webm)",
          destination: "/asset-404",
        },
      ],
    };
  },
};

// Compiles the MDX under content/docs into the generated .source module that
// src/lib/source.ts loads.
const withMDX = createMDX();

export default withMDX(config);
