"use client";

import {
  type CategoryDef,
  CookieBanner,
  CookieOptOut,
  CookiePreferences,
  GatedScript,
  initCookieYes,
  RecallButton,
  resetCookieYes,
  type ThemeConfig,
} from "@cookieyes/react";
// The same import the generated setup tells visitors to make, for the same reason: without
// it the components render as unstyled text. It belongs to this route's bundle only, so the
// surrounding site never loads it.
import "@cookieyes/react/styles.css";
import { type ReactNode, useEffect, useState } from "react";
import {
  BUILT_IN_CATEGORY_IDS,
  DEMO_SCRIPTS,
  FONTS,
  type LogEvent,
  logReply,
  type PlaygroundConfig,
  parsePreviewMessage,
  REQUIRED_CATEGORY_ID,
  readyReply,
} from "./playground-config";
import { installEphemeralCookieJar } from "./preview-cookie-jar";

// At module scope, not in an effect: this has to be in place before anything in the SDK
// can reach `document.cookie`. See preview-cookie-jar.ts for why it exists.
installEphemeralCookieJar();

/**
 * Sends one console line to the parent as it happens.
 *
 * Append-only and fire-and-forget: the parent owns the list — and its numbering, since
 * this frame reloads on Replay and Reset — so Clear is just emptying it there. Nothing here is inferred — `allowed` is sent by a
 * script's own load callback, `blocked` from the consent snapshot that is holding it.
 */
function log(level: LogEvent["level"], message: string, meta?: string): void {
  const now = new Date();
  const entry: LogEvent = {
    time: `${now.toTimeString().slice(0, 8)}.${String(now.getMilliseconds()).padStart(3, "0")}`,
    level,
    message,
    ...(meta ? { meta } : {}),
  };
  window.parent.postMessage(logReply(entry), window.location.origin);
}

/** Only the keys the visitor can change; everything else stays on the SDK's own defaults. */
function themeFor(config: PlaygroundConfig): ThemeConfig {
  const fontFamily = FONTS[config.font].preview;
  return {
    primaryColor: config.primaryColor,
    borderRadius: `${config.borderRadius}px`,
    ...(fontFamily ? { fontFamily } : {}),
  };
}

/**
 * Built-in ids carry no label — the SDK translates those itself. Ids the visitor invented
 * have no translation to fall back on, so they bring their own.
 */
function categoriesFor(config: PlaygroundConfig): CategoryDef[] {
  return config.categories.map((id) => {
    const label = config.customLabels[id];
    return {
      id,
      ...(id === REQUIRED_CATEGORY_ID ? { required: true } : {}),
      ...(label && !BUILT_IN_CATEGORY_IDS.includes(id) ? { label } : {}),
    };
  });
}

/** Reports which gated scripts the current consent is holding back. */
function logHeldScripts(config: PlaygroundConfig, granted: Record<string, boolean>): void {
  for (const script of DEMO_SCRIPTS) {
    if (!config.categories.includes(script.category)) continue;
    // A granted script announces itself through its own onLoad; only the held ones are
    // reported from here, so nothing claims to have run that has not.
    if (!granted[script.category]) log("blocked", `script.hold  ${script.label}`, script.category);
  }
}

function mountRuntime(config: PlaygroundConfig): void {
  resetCookieYes();
  const onSnapshot = (state: { categories: Record<string, boolean>; hasActed: boolean }) => {
    log("info", "consent.change", state.hasActed ? "visitor decided" : "no decision yet");
    logHeldScripts(config, state.categories);
  };

  initCookieYes({
    mode: "cookie-only",
    regulation: config.regulation,
    colorScheme: config.colorScheme,
    theme: themeFor(config),
    categories: categoriesFor(config),
    // The preview must look the same to every visitor, so it never follows the browser's
    // language — the playground offers no language control yet.
    i18n: { messages: { en: config.text }, detectBrowserLanguage: false },
    onConsentReady: onSnapshot,
    onConsentUpdate: onSnapshot,
  });

  log(
    "info",
    "cookieyes.mount",
    `regulation ${config.regulation}, ${config.categories.length} categories`,
  );
}

/**
 * The document inside the playground's iframe: our real components over a blank stand-in
 * for a host page.
 *
 * A config change remounts rather than mutates. The runtime is a module-level singleton
 * with no setter for theme or regulation, so `resetCookieYes()` then a fresh
 * `initCookieYes()` is the honest way to reconfigure it, and re-keying the subtree makes
 * sure no component keeps reading the runtime it captured last time.
 */
export function PreviewApp() {
  const [config, setConfig] = useState<PlaygroundConfig | null>(null);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const message = parsePreviewMessage(event);
      if (!message) return;
      setConfig(message.config);
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Keep announcing until the parent answers with a config.
  //
  // This frame is its own document and often finishes before the page around it hydrates,
  // so a single announcement can land before the parent is listening and be lost for good —
  // leaving the preview permanently blank. Repeating costs nothing, and the effect's cleanup
  // stops it the moment a config arrives.
  useEffect(() => {
    if (config) return;
    const announce = () => window.parent.postMessage(readyReply(), window.location.origin);
    announce();
    const timer = setInterval(announce, 150);
    return () => clearInterval(timer);
  }, [config]);

  useEffect(() => {
    if (!config) return;
    mountRuntime(config);
    setGeneration((value) => value + 1);
  }, [config]);

  return (
    // The stand-in page follows the colour scheme too. Judging a brand colour against our
    // dark background is the point of the control, and a dark banner floating on a white
    // page is not what the visitor would actually ship.
    <div className="cy-pg-page" data-scheme={config?.colorScheme ?? "light"}>
      <HostPageSkeleton />
      {/* Nothing until the parent's config lands: mounting on a guessed config first
          would show a banner that visibly flips a moment later. */}
      {generation > 0 && config ? (
        <div key={generation}>
          <CookieBanner />
          <CookiePreferences />
          <CookieOptOut />
          <RecallButton />
          {/* Only for categories the visitor kept: a row that could never run whatever they
              did would read as a bug rather than as blocking working. */}
          {DEMO_SCRIPTS.filter((script) => config.categories.includes(script.category)).map(
            (script) => (
              <GatedScript
                key={script.id}
                id={script.id}
                src={script.src}
                category={script.category}
                onLoad={() => log("allowed", `script.run   ${script.label}`, script.category)}
              />
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A deliberately wordless stand-in for the visitor's own site. Real copy would compete
 * with the banner for attention and invite comparison with a page we are not designing.
 */
function HostPageSkeleton(): ReactNode {
  return (
    <>
      <div className="cy-pg-page-bar" aria-hidden="true">
        <span className="cy-pg-skeleton" style={{ width: "88px" }} />
        <span className="cy-pg-skeleton" style={{ width: "52px" }} />
        <span className="cy-pg-skeleton" style={{ width: "52px" }} />
        <span className="cy-pg-skeleton cy-pg-page-bar-end" style={{ width: "72px" }} />
      </div>
      <div className="cy-pg-page-body" aria-hidden="true">
        <span className="cy-pg-skeleton cy-pg-page-heading" style={{ width: "62%" }} />
        <span className="cy-pg-skeleton cy-pg-page-heading" style={{ width: "44%" }} />
        <span className="cy-pg-skeleton" style={{ width: "84%" }} />
        <span className="cy-pg-skeleton" style={{ width: "76%" }} />
        <span className="cy-pg-skeleton" style={{ width: "54%" }} />
        <span className="cy-pg-skeleton cy-pg-page-block" />
      </div>
    </>
  );
}
