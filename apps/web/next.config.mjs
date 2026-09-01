import { createMDX } from "fumadocs-mdx/next";

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Next writes AGENTS.md / CLAUDE.md into the app on `next dev`; this app does not
  // want them checked in.
  agentRules: false,
};

// Compiles the MDX under content/docs into the generated .source module that
// src/lib/source.ts loads.
const withMDX = createMDX();

export default withMDX(config);
