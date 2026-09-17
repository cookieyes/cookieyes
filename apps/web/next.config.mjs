import { createMDX } from "fumadocs-mdx/next";

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Next writes AGENTS.md / CLAUDE.md into the app on `next dev`; this app does not
  // want them checked in.
  agentRules: false,

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
