"use client";

import { useEffect, useState } from "react";
import { writeToClipboard } from "@/components/docs/clipboard";

const CONFIRMATION_MS = 2000;

/**
 * The generated setup, ready to paste.
 *
 * Deliberately not syntax-highlighted. The docs colour their code at build time through
 * rehype, but this code is built from live state, so highlighting it would mean shipping
 * Shiki's engine and grammars to the browser — a few hundred kilobytes added to the page
 * whose whole promise is that it loads fast. Twenty lines of monospace read fine without.
 */
export function CodePanel({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), CONFIRMATION_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    await writeToClipboard(code);
    setCopied(true);
  }

  return (
    <div className="cy-pg-code">
      <div className="cy-pg-code-bar">
        <span className="cy-pg-code-name">app/cookieyes.tsx</span>
        <button type="button" className="cy-pg-copy" onClick={copy}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="cy-pg-code-body">
        <code>{code}</code>
      </pre>
      {/* The button's own label changes, but a screen reader following focus elsewhere
          would not hear it — this announces the result once, then falls silent. */}
      <p aria-live="polite" className="cy-pg-visually-hidden">
        {copied ? "Setup code copied to clipboard" : ""}
      </p>
    </div>
  );
}
