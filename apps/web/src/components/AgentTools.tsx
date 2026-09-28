"use client";

import { useEffect } from "react";

/**
 * WebMCP (webmachinelearning.github.io/webmcp): tools an AI agent driving the browser can
 * call on this site. Two are enough for a docs site: search the docs, and read any page as
 * Markdown. Browsers without WebMCP ignore this component.
 */
type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** Both tools only read, and return this site's own content. */
  annotations: { readOnlyHint: boolean };
  execute: (input: Record<string, unknown>) => Promise<unknown>;
};

type ModelContext = {
  provideContext?: (context: { tools: Tool[] }) => unknown;
  registerTool?: (tool: Tool) => unknown;
};

/**
 * Where the browser exposes WebMCP. Chrome's implementation puts it on `document`; the
 * explainer's earlier drafts used `navigator`, which is kept as the fallback.
 */
function modelContext(): ModelContext | null {
  const doc = document as Document & { modelContext?: ModelContext };
  const nav = navigator as Navigator & { modelContext?: ModelContext };
  return doc.modelContext ?? nav.modelContext ?? null;
}

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
    annotations: { readOnlyHint: true },
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
    annotations: { readOnlyHint: true },
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

/** The context the tools went to, so a client navigation does not register them twice. */
let registeredWith: ModelContext | null = null;

/**
 * Registers each tool with `registerTool`, the current API; `provideContext`, from earlier
 * drafts, only when that is all the browser has. A tool the browser rejects is logged and
 * skipped rather than stopping the others.
 */
async function register(context: ModelContext): Promise<void> {
  if (context === registeredWith) return;
  registeredWith = context;
  if (typeof context.registerTool === "function") {
    const add = context.registerTool.bind(context);
    const results = await Promise.all(
      tools.map(async (tool) => {
        try {
          await add(tool);
          return true;
        } catch (error) {
          console.error(`[webmcp] could not register "${tool.name}":`, error);
          return false;
        }
      }),
    );
    if (!results.some(Boolean)) registeredWith = null;
  } else if (typeof context.provideContext === "function") {
    context.provideContext({ tools });
  }
}

/** How long to keep looking for WebMCP after the page loads, in milliseconds. */
const WAIT_FOR_CONTEXT_MS = 60_000;

export function AgentTools() {
  // The browser or an agent extension can expose WebMCP after the page has started, so
  // look again for a while: every 100ms at first, then less often, for up to a minute.
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    const look = () => {
      if (stopped) return;
      const context = modelContext();
      if (context) {
        void register(context);
        return;
      }
      const elapsed = Date.now() - startedAt;
      if (elapsed >= WAIT_FOR_CONTEXT_MS) return;
      timer = setTimeout(look, elapsed < 3_000 ? 100 : elapsed < 10_000 ? 500 : 2_000);
    };
    look();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, []);
  return null;
}
