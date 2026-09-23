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
    const moved = ["nextjs", "react"].map((fw) => ({
      source: `/docs/${fw}/headless/overview`,
      destination: `/docs/${fw}/headless/banner`,
      permanent: true,
    }));
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
    return [...roots, ...moved, ...byQuery, ...byPath];
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
