"use client";

import { useEffect, useId, useRef, useState } from "react";
import { type ConfigSandbox, createConfigSandbox } from "./config-sandbox";
import { generateConfigBody, SETUP_FOOTER, SETUP_HEADER } from "./generate-setup-code";
import { highlight } from "./highlight";
import type { PlaygroundConfig } from "./playground-config";
import { readConfig } from "./read-config";

/** Matches the controls, so typing here and typing there feel the same. */
const APPLY_DELAY_MS = 200;

const countLines = (text: string) => text.split("\n").length;

/**
 * The generated setup, as one code listing whose config body can be edited.
 *
 * Always dark, like the design's editor and unlike the docs' build-time code blocks. That
 * is what makes it read as an editor rather than as text on a card, and it means the panel
 * looks the same whichever theme the site is in.
 */
export function CodePanel({
  config,
  onConfigChange,
}: {
  config: PlaygroundConfig;
  onConfigChange: (config: PlaygroundConfig) => void;
}) {
  const errorId = useId();
  const editorId = useId();
  const [draft, setDraft] = useState(() => generateConfigBody(config));
  const [error, setError] = useState<string | null>(null);

  // Distinguishes a config we just produced from one the controls produced. Only the
  // latter should rewrite the draft — otherwise typing would fight the cursor.
  const emitted = useRef<PlaygroundConfig | null>(null);
  const [lastConfig, setLastConfig] = useState(config);
  if (config !== lastConfig) {
    setLastConfig(config);
    if (config !== emitted.current) {
      setDraft(generateConfigBody(config));
      setError(null);
    }
  }

  const sandbox = useRef<ConfigSandbox | null>(null);
  useEffect(() => {
    sandbox.current = createConfigSandbox();
    return () => {
      sandbox.current?.destroy();
      sandbox.current = null;
    };
  }, []);

  useEffect(() => {
    // Text identical to what the config generates is valid by construction — and it is how
    // someone undoes a mistake, so any standing error has to go with it.
    if (draft === generateConfigBody(config)) {
      setError(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      // The braces live in the fixed text either side, so they go back on before reading.
      const result = await sandbox.current?.evaluate(`{${draft}}`);
      if (cancelled || !result) return;

      if (!result.ok) {
        setError(result.error);
        return;
      }
      const read = readConfig(result.value);
      if (!read.ok) {
        setError(read.error);
        return;
      }
      setError(null);

      // Compare by generated text, which is value equality for everything we hold. Without
      // this, text that means the same as the current config but is formatted differently
      // — any hand-typed edit — would emit a new config object, re-run this effect through
      // its `config` dependency, and remount the preview on a loop.
      if (generateConfigBody(read.config) === generateConfigBody(config)) return;

      emitted.current = read.config;
      onConfigChange(read.config);
    }, APPLY_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draft, config, onConfigChange]);

  const totalLines = countLines(SETUP_HEADER) + countLines(draft) + countLines(SETUP_FOOTER);

  return (
    <div className="cy-pg-code">
      {/* Above the code, not below it: the message is about the text you are looking at, and
          it should not move the editor when it appears. */}
      <p id={errorId} className="cy-pg-code-error" role="alert" hidden={!error}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 4.8v3.9M8 11.2h.01" />
        </svg>
        <span>{error}</span>
      </p>

      <div className="cy-pg-editor">
        {/* One text node rather than a node per line, and hidden from screen readers —
            announcing every line number would bury the code itself. */}
        <pre className="cy-pg-gutter" aria-hidden="true">
          {Array.from({ length: totalLines }, (_, index) => index + 1).join("\n")}
        </pre>

        <div className="cy-pg-listing">
          <pre className="cy-pg-fixed">{highlight(SETUP_HEADER)}</pre>

          <div className="cy-pg-editable">
            {/* The visible colours. The textarea above holds the real text with its own
                glyphs transparent, so both layers wrap and align identically. */}
            <pre className="cy-pg-editable-ink" aria-hidden="true">
              {highlight(draft)}
              {"\n"}
            </pre>
            <label className="cy-pg-visually-hidden" htmlFor={editorId}>
              Configuration — edits apply to the preview
            </label>
            <textarea
              id={editorId}
              className="cy-pg-editable-input"
              value={draft}
              spellCheck={false}
              aria-invalid={error !== null}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>

          <pre className="cy-pg-fixed">{highlight(SETUP_FOOTER)}</pre>
        </div>
      </div>

      {/* Polite and below the editor, as the design has it: a status about what typing
          does, not an interruption. */}
      <p className="cy-pg-code-stat" aria-live="polite">
        Edits apply as you type.
      </p>
    </div>
  );
}
