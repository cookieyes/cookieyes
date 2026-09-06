"use client";

import { useEffect, useRef, useState } from "react";
import {
  configMessage,
  type PlaygroundConfig,
  PREVIEW_PATH,
  parsePreviewReply,
  replayMessage,
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
}: {
  config: PlaygroundConfig;
  replayCount: number;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function onReply(event: MessageEvent) {
      if (parsePreviewReply(event)) setReady(true);
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

  useEffect(() => {
    if (!ready || replayCount === 0) return;
    frame.current?.contentWindow?.postMessage(replayMessage(), window.location.origin);
  }, [ready, replayCount]);

  return (
    <div className="cy-pg-preview">
      <iframe ref={frame} src={PREVIEW_PATH} title="Banner preview" className="cy-pg-frame" />
    </div>
  );
}
