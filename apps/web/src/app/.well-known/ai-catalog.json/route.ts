import { SITE_URL } from "@/lib/site";

/**
 * ARD manifest (agenticresourcediscovery.org): what an agent can use on this host. The
 * docs index and the two skills; there is no API, MCP server or login here.
 */
export const dynamic = "force-static";

export function GET() {
  const host = "developers.cookieyes.com";
  const manifest = {
    specVersion: "1.0",
    host: { displayName: "CookieYes for Developers", identifier: `urn:air:${host}` },
    entries: [
      {
        identifier: `urn:air:${host}:index:docs`,
        displayName: "CookieYes SDK documentation index",
        type: "text/plain",
        url: `${SITE_URL}/llms.txt`,
        description:
          "Index of the developer docs for the open-source @cookieyes packages: installation for Next.js, React and JavaScript, configuration, components, hooks, styling, integrations and the changelog. Each page is also served as Markdown on request.",
        representativeQueries: [
          "how do I add a cookie consent banner to a Next.js app",
          "CookieYes React SDK documentation",
          "open-source cookie consent for React",
        ],
      },
      {
        identifier: `urn:air:${host}:skill:install-consent-banner`,
        displayName: "Install the CookieYes consent banner",
        type: "text/markdown",
        url: `${SITE_URL}/.well-known/agent-skills/install-consent-banner/SKILL.md`,
        description:
          "Step-by-step skill for adding the CookieYes consent banner to a Next.js, React or plain JavaScript site with the @cookieyes packages.",
        representativeQueries: [
          "add GDPR cookie consent to my Next.js site",
          "install a cookie banner in a React app without a hosted service",
          "set up cookie consent with npm",
        ],
      },
      {
        identifier: `urn:air:${host}:skill:gate-third-party-scripts`,
        displayName: "Load third-party tools only after consent",
        type: "text/markdown",
        url: `${SITE_URL}/.well-known/agent-skills/gate-third-party-scripts/SKILL.md`,
        description:
          "Skill for loading Google Analytics, Google Tag Manager, Google Ads, Meta Pixel, Microsoft Clarity, PostHog, Segment or any script only after the visitor consents, using the @cookieyes/scripts integrations and Google Consent Mode v2.",
        representativeQueries: [
          "load Google Analytics only after cookie consent in Next.js",
          "Google Consent Mode v2 with a React consent banner",
          "block Meta Pixel until the user accepts marketing cookies",
        ],
      },
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
