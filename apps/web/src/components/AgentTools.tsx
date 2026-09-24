"use client";

import { useEffect } from "react";

/**
 * WebMCP (webmachinelearning.github.io/webmcp): tools an AI agent driving the browser can
 * call on this site. Two are enough for a docs site: search the docs, and read any page as
 * Markdown. Browsers without `navigator.modelContext` ignore this component.
 */
type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
};

type ModelContext = {
  provideContext?: (context: { tools: Tool[] }) => unknown;
  registerTool?: (tool: Tool) => unknown;
};

const tools: Tool[] = [
  {
    name: "search_docs",
    description:
      "Search the CookieYes SDK documentation. Returns matching pages with title, URL and an excerpt. Restrict to one framework with `framework`: nextjs, react or core (plain JavaScript).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Words to search for; every word must match." },
        framework: { type: "string", enum: ["nextjs", "react", "core"] },
      },
      required: ["query"],
    },
    execute: async ({ query, framework }) => {
      const url = new URL("/api/search", window.location.origin);
      url.searchParams.set("query", String(query));
      if (typeof framework === "string") url.searchParams.set("tag", framework);
      const response = await fetch(url);
      return response.json();
    },
  },
  {
    name: "read_page",
    description:
      "Read a page of this site as Markdown. Pass the path, for example /docs/nextjs/getting-started/installation or / for the home page.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "A path on this site, starting with /." },
      },
      required: ["path"],
    },
    execute: async ({ path }) => {
      const url = new URL(String(path), window.location.origin);
      if (url.origin !== window.location.origin)
        throw new Error("Only pages on this site can be read.");
      const response = await fetch(url, { headers: { Accept: "text/markdown" } });
      if (!response.ok) throw new Error(`Page not found: ${url.pathname}`);
      return response.text();
    },
  },
];

// Registered once per page load. Strict Mode runs effects twice in development, and the
// provider stays mounted across client navigations, so a flag is enough.
let registered = false;

export function AgentTools() {
  useEffect(() => {
    const context = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
    if (!context || registered) return;
    registered = true;
    if (typeof context.provideContext === "function") context.provideContext({ tools });
    else if (typeof context.registerTool === "function")
      for (const tool of tools) context.registerTool(tool);
  }, []);
  return null;
}
