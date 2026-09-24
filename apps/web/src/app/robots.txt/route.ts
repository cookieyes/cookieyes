import { SITE_URL } from "@/lib/site";

/**
 * robots.txt as a plain-text route rather than Next's `robots.ts`, because the metadata
 * helper cannot emit the `Content-Signal` line (contentsignals.org) that states how the
 * content may be used.
 *
 * The docs are public, so every crawler gets the same rules. The signals and the list of
 * AI crawlers match www.cookieyes.com/robots.txt, which grants search, AI answers and AI
 * training alike; the crawlers are named in a second group only so that is explicit.
 */
const RULES = [
  "Allow: /",
  "Disallow: /api/",
  "Content-Signal: search=yes, ai-input=yes, ai-train=yes",
];

const AI_CRAWLERS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

const body = [
  "User-agent: *",
  ...RULES,
  "",
  ...AI_CRAWLERS.map((agent) => `User-agent: ${agent}`),
  ...RULES,
  "",
  `Sitemap: ${SITE_URL}/sitemap.xml`,
  "",
].join("\n");

export const dynamic = "force-static";

export function GET() {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
