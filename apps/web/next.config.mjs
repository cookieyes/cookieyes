/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Next writes AGENTS.md / CLAUDE.md into the app on `next dev`; this app does not
  // want them checked in.
  agentRules: false,
};

export default config;
