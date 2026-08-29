"use client";

import { CodeBlock, CodeBlockTabs, Pre } from "fumadocs-ui/components/codeblock";
import {
  type ComponentProps,
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { writeToClipboard } from "./clipboard";

/**
 * Tracks whether the current `pre` (mdx.tsx's `DocsPre`, below) sits inside a tabbed
 * code group (CodeBlockTabsWithCopyContext) or stands alone. The standalone case keeps
 * Fumadocs' own icon-only copy button unchanged (an accepted, unrelated gap — see
 * theme.css's `.cy-doc-cb button` comment); the tabbed case gets exactly one copy
 * control, moved into the tab bar itself (docs.html:534-545, `.ct` + `.cp`), so
 * suppressing each pane's own button here keeps the two from doubling up.
 */
const InsideCodeTabsContext = createContext(false);

/** Wraps Fumadocs' CodeBlockTabs, marking every nested `pre` as "inside a tab group". */
export function CodeBlockTabsWithCopyContext(props: ComponentProps<typeof CodeBlockTabs>) {
  return (
    <InsideCodeTabsContext.Provider value={true}>
      <CodeBlockTabs {...props} />
    </InsideCodeTabsContext.Provider>
  );
}

/**
 * mdx.tsx's `pre` mapping, factored out into its own "use client" module because it
 * needs to read InsideCodeTabsContext — mdx.tsx itself has no "use client" directive
 * (it is composed into the server-rendered docs page), and hooks are only valid in a
 * client module.
 *
 * `allowCopy` is always `false` here, for both the tabbed and standalone case: the
 * design's `.cp` (docs.html:209-211) is a bordered "Copy"/"Copied!" TEXT button, not
 * Fumadocs' own icon-only `CopyButton` (codeblock.js) that `allowCopy: true` would
 * render — that gap used to be accepted for standalone blocks only (this comment's
 * previous revision), but the design wants the same text button on every snippet, not
 * just tabbed ones. The tabbed case already supplies its own via
 * `CodeTabsCopyButton` (CodeBlockTabsList, mdx.tsx); the standalone case gets its own
 * copy of the same button through `Actions` below, since Fumadocs only exposes the
 * per-block `<pre>` to its OWN `CopyButton` (via an internal `containerRef` the
 * `Actions` render prop is never handed) — `useBlockCopyButton` below re-derives it
 * from the DOM instead, the same way `CodeTabsCopyButton` already had to.
 */
export function DocsPre(props: ComponentProps<"pre">) {
  const insideTabs = useContext(InsideCodeTabsContext);
  return (
    <CodeBlock
      {...props}
      className="cy-doc-cb"
      allowCopy={false}
      Actions={insideTabs ? undefined : StandaloneCopyActions}
    >
      <Pre>{props.children}</Pre>
    </CodeBlock>
  );
}

/** Fumadocs' own `Actions` slot (codeblock.js) — same position/backdrop classes it
 * would otherwise wrap its own icon `CopyButton` in, holding our text button instead. */
function StandaloneCopyActions({ className }: { className?: string }) {
  return (
    <div className={className}>
      <CopyTextButton blockSelector=".cy-doc-cb" />
    </div>
  );
}

/**
 * Shared "copy the block's own `<pre>`" logic behind both text copy buttons
 * (`CodeTabsCopyButton` below and `StandaloneCopyActions` above). `blockSelector` is
 * `.cy-doc-cb-tabs` for the tabbed case (the whole tab group; Radix `Tabs.Content`
 * unmounts inactive panes — verified against @radix-ui/react-tabs: `Presence
 * present={forceMount || isSelected}`, and Fumadocs' own CodeBlockTab never sets
 * forceMount — so exactly one `<pre>` exists under it at a time) and `.cy-doc-cb` for
 * the standalone case (the block's own figure).
 */
function useBlockCopyButton(blockSelector: string) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleClick = useCallback(async () => {
    const block = buttonRef.current?.closest(blockSelector);
    const pre = block?.querySelector("pre");
    if (!pre) return;

    // Mirrors Fumadocs' own CopyButton (codeblock.js): clone the pre and drop any
    // `.nd-copy-ignore` nodes (line numbers, diff markers) before reading text, so
    // those never end up in the clipboard.
    const clone = pre.cloneNode(true) as HTMLElement;
    for (const node of Array.from(clone.querySelectorAll(".nd-copy-ignore"))) {
      node.replaceWith("\n");
    }

    try {
      await writeToClipboard(clone.textContent ?? "");
    } catch {
      // Clipboard write can throw (permission denied, insecure context with no
      // fallback available) — leave the button in its idle "Copy" state rather than
      // claiming success it did not have.
      return;
    }
    setCopied(true);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    // 2000ms, transcribed from docs.html:2003.
    timeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
  }, [blockSelector]);

  return { buttonRef, copied, handleClick };
}

/** The design's `.cp` (docs.html:209-211): a bordered "Copy"/"Copied!" text button. */
function CopyTextButton({ blockSelector }: { blockSelector: string }) {
  const { buttonRef, copied, handleClick } = useBlockCopyButton(blockSelector);
  return (
    <button
      type="button"
      ref={buttonRef}
      className="cy-doc-cp"
      data-copied={copied || undefined}
      onClick={handleClick}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

/**
 * The design's `.cp` inside `.ct` (docs.html:539, 551): one text-labelled Copy
 * control per tabbed block, sitting in the tab bar and copying whichever tab is
 * currently active.
 */
export function CodeTabsCopyButton() {
  return <CopyTextButton blockSelector=".cy-doc-cb-tabs" />;
}
