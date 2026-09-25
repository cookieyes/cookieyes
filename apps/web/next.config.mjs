import { createMDX } from "fumadocs-mdx/next";

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
      // playground embeds its own preview page). No full Content-Security-Policy yet: the
      // CookieYes banner, GA4 and Clarity load from several origins and need a Report-Only
      // pass before one can be enforced.
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
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
