import { SITE_URL } from "@/lib/site";
import { source } from "@/lib/source";

/**
 * llms.txt (llmstxt.org): a short index of the docs for AI agents, one line per page with
 * the page's own description. Every page listed here is also available as Markdown from
 * its URL, so the file points agents at that instead of copying the docs.
 */
const SECTIONS: Record<string, string> = {
  nextjs: "Next.js",
  react: "React",
  core: "JavaScript",
  changelog: "Changelog",
};

export const dynamic = "force-static";

export function GET() {
  const groups = new Map<string, string[]>();
  for (const page of source.getPages()) {
    const root = page.slugs[0] ?? "";
    const line = `- [${page.data.title}](${SITE_URL}${page.url})${page.data.description ? `: ${page.data.description}` : ""}`;
    groups.set(root, [...(groups.get(root) ?? []), line]);
  }

  const body = [
    "# CookieYes for Developers",
    "",
    "> Open-source consent management for React, Next.js and plain JavaScript. The @cookieyes packages render a cookie banner, store the visitor's choice and load third-party tools only after consent. MIT licensed, runs in your frontend, no hosted runtime required.",
    "",
    `> Every page below is also available as Markdown: send \`Accept: text/markdown\` to the page URL. Agent skills: ${SITE_URL}/.well-known/agent-skills/index.json`,
    "",
    `- [Home](${SITE_URL}/): what the SDK does and how to start`,
    `- [Playground](${SITE_URL}/playground): try the banner before installing`,
    "",
    ...Object.entries(SECTIONS).flatMap(([root, title]) => {
      const lines = groups.get(root);
      return lines ? [`## ${title}`, "", ...lines, ""] : [];
    }),
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
