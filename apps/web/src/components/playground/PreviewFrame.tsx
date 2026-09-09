"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import {
  configMessage,
  type LogEvent,
  MIN_PREVIEW_SCALE,
  type PlaygroundConfig,
  PREVIEW_PATH,
  PREVIEW_WIDTH,
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
  const stage = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // The panel's own width. 0 means "not measured yet" — the frame stays hidden for that
  // first frame rather than flashing at full size.
  const [stageWidth, setStageWidth] = useState(0);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0;
      if (width > 0) setStageWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Wide enough to be worth faking a desktop; below that the frame is simply itself.
  const desktop = stageWidth / PREVIEW_WIDTH >= MIN_PREVIEW_SCALE;
  const frameWidth = desktop ? PREVIEW_WIDTH : stageWidth;
  const scale = desktop ? stageWidth / PREVIEW_WIDTH : 1;

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
    // Reload to a URL that says this is a replay, so the frame's mount line can say so too.
    frame.current?.contentWindow?.location.replace(`${PREVIEW_PATH}?replay=${replayCount}`);
  }, [replayCount]);

  return (
    <div className="cy-pg-preview">
      <div className="cy-pg-stagehead">
        <span className="cy-pg-stagehead-lbl">Preview</span>
        <span className="cy-pg-stagehead-note">
          A placeholder site running your config. Use the banner the way a visitor would.
        </span>
      </div>
      {/* The frame is laid out at desktop width and scaled down to fill this box, so the
          box keeps the design's size while the banner inside renders at a real page's
          proportions. The box clips, so the scaled frame changes nothing around it. */}
      <div className="cy-pg-stage" ref={stage}>
        <iframe
          ref={frame}
          src={PREVIEW_PATH}
          title="Banner preview"
          className="cy-pg-frame"
          style={
            {
              width: frameWidth,
              visibility: stageWidth ? "visible" : "hidden",
              "--cy-pg-scale": scale,
            } as CSSProperties
          }
        />
      </div>
    </div>
  );
}
