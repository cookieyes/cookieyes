"use client";

import { useEffect, useRef, useState } from "react";
import {
  configMessage,
  type LogEvent,
  type PlaygroundConfig,
  PREVIEW_PATH,
  parsePreviewReply,
} from "./playground-config";

/**
 * The parent half of the preview channel.
 *
 * The frame is loaded eagerly and given a fixed height: it sits near the top of the page,
 * so deferring it would only replace a fast paint with a visible jump.
 */
export function PreviewFrame({
  config,
  replayCount,
  onLog,
}: {
  config: PlaygroundConfig;
  replayCount: number;
  onLog: (event: LogEvent) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  // Held in a ref so the listener below can mount once and stay. Re-attaching it whenever
  // the callback's identity changed left a gap on every render, and the frame's one-time
  // `ready` landing in that gap meant the config was never sent and the preview stayed
  // blank.
  const onLogRef = useRef(onLog);
  onLogRef.current = onLog;

  useEffect(() => {
    function onReply(event: MessageEvent) {
      const reply = parsePreviewReply(event);
      if (!reply) return;
      if (reply.type === "ready") setReady(true);
      else onLogRef.current(reply.entry);
    }
    window.addEventListener("message", onReply);
    return () => window.removeEventListener("message", onReply);
  }, []);

  // Waiting for `ready` rather than for `load` — the frame's document exists before React
  // has mounted inside it, and a message sent in that gap has no listener yet.
  useEffect(() => {
    if (!ready) return;
    frame.current?.contentWindow?.postMessage(configMessage(config), window.location.origin);
  }, [ready, config]);

  // Replaying reloads the frame rather than resetting state inside it. A script that has
  // already run cannot be un-run, so only a fresh document is honestly a first visit — and
  // the in-memory cookie jar goes with it. `ready` will fire again and the config follows.
  useEffect(() => {
    if (replayCount === 0) return;
    setReady(false);
    frame.current?.contentWindow?.location.reload();
  }, [replayCount]);

  return (
    <div className="cy-pg-preview">
      <iframe ref={frame} src={PREVIEW_PATH} title="Banner preview" className="cy-pg-frame" />
    </div>
  );
}
