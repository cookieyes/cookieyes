"use client";

import type { RegionDecision } from "@cookieyes/react";
import { _tryGetCookieYes, resolveRegion } from "@cookieyes/react";
import { useEffect, useState } from "react";
import { DevtoolsPanel } from "./components/DevtoolsPanel.js";
import { DevtoolsTrigger } from "./components/DevtoolsTrigger.js";
import { useDevRuntimeData } from "./hooks/useDevRuntimeData.js";
import { useDevtoolsTheme } from "./hooks/useDevtoolsTheme.js";
import { useDevtoolsUiState } from "./hooks/useDevtoolsUiState.js";
import { useForceRegion } from "./hooks/useForceRegion.js";
import { useKeyboardShortcut } from "./hooks/useKeyboardShortcut.js";
import type { CookieYesDevtoolsProps } from "./types.js";

/**
 * Sentinel marker asserting this is the REAL panel's module graph. Not read
 * by any runtime code — its only job is to exist as a distinctive string
 * literal so the size gate's content check (A2 item 2 / design §9 test 29)
 * can assert it is absent from every emitted chunk of a production build.
 * If this string ever appears in a production bundle, the exclusion
 * mechanism (the package's conditional exports, AD-1) has failed.
 */
export const __COOKIEYES_DEVTOOLS_REAL__ = true;

const PANEL_ID = "cookieyes-devtools-panel";

/**
 * The in-page CookieYes debugging panel. SSR-safe (`_tryGetCookieYes()`
 * degrades to render `null`, matching every other SDK hook/component's
 * degrade-to-no-op contract) and renders `null` until a runtime is mounted.
 *
 * This is the `"development"` conditional-export target (AD-1) — reached only
 * when a bundler sets the `development` condition (a dev server / `next dev`).
 * A production build resolves the package's stub entry instead, and this
 * entire module graph — this component, every tab, the CSS import, every
 * `@cookieyes/core`/`@cookieyes/react` symbol below — is never reached.
 */
export function CookieYesDevtools(props?: CookieYesDevtoolsProps) {
  const position = props?.position ?? "bottom-right";
  const [runtime, setRuntime] = useState(() => _tryGetCookieYes());
  // False on the server and on the first client render, so both render nothing
  // and hydration matches. The panel reads browser-only state (the runtime
  // registry, localStorage, the override cookie), so it appears only after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // The runtime registry is a module-level singleton set up by `initCookieYes`
  // — it may not exist yet on the very first client render (or may be
  // replaced across a dev HMR remount). Poll lightly rather than assume a
  // mount order; this is a dev-only convenience, not a production hot path.
  useEffect(() => {
    const id = setInterval(() => setRuntime(_tryGetCookieYes()), 500);
    return () => clearInterval(id);
  }, []);

  const { state, toggleOpen, setOpen, setActiveTab, setPosition } = useDevtoolsUiState(position);
  const { region: forcedRegion, setRegion, clearRegion } = useForceRegion();
  const { data, clearEvents } = useDevRuntimeData(runtime);
  const theme = useDevtoolsTheme(props?.theme);

  useKeyboardShortcut(
    state.open,
    () => toggleOpen(),
    () => setOpen(false),
  );

  // Null on the server, on the first (hydrating) client render, and until a
  // runtime is mounted — matching every other SDK hook/component's
  // degrade-to-no-op contract. Once mounted, the trigger always renders; the
  // panel only while open.
  if (!mounted || !runtime) return null;

  // What the SDK would decide with the override applied, using its own
  // `resolveRegion` and the runtime's real region config (sent through the dev
  // queue): the forced region is mapped exactly as it would be, falls back to
  // the strictest regulation when unmapped, and loses to a manually pinned
  // `regulation` — so the panel never shows a combination the SDK can't produce.
  const baseDecision: RegionDecision = data?.region.decision ?? {
    region: undefined,
    regulation: "DEFAULT",
    source: "manual",
    confidence: "high",
  };
  const regionConfig = data?.region.config;
  // A pinned `regulation` always wins in `resolveRegion`; skip the call then
  // (the answer is known) rather than trigger its manual-vs-detect warning on
  // every render.
  const previewDecision: RegionDecision =
    forcedRegion !== undefined && regionConfig?.region && !regionConfig.regulation
      ? resolveRegion(regionConfig.region, undefined, forcedRegion)
      : baseDecision;
  // An override is set but can't take effect: `regulation` is pinned manually
  // (or there is no region config at all), so production ignores the region too.
  const forcedRegionIgnored = forcedRegion !== undefined && previewDecision.source !== "forced";

  // Story 3.5 ("clear which header or signal drove the real decision"): a
  // server helper (`getServerRegion()`) is the only thing that actually knows
  // the request's headers — this client component can't read them itself, so
  // the developer passes what it found. Without that prop (a plain
  // client-only React app, or a Next.js app that hasn't wired it up yet),
  // fall back to disclosing that it was determined client-side rather than
  // rendering nothing.
  const serverDriving = props?.serverRegion?.drivingSignal;
  const drivingSignalLabel =
    previewDecision.source === "forced"
      ? undefined
      : serverDriving
        ? `${serverDriving.header}=${serverDriving.value}`
        : `determined in the browser: ${previewDecision.source}`;

  return (
    <div
      className="cyd-root"
      data-cyd-part="root"
      data-cyd-theme={theme.resolved === "system" ? undefined : theme.resolved}
    >
      <DevtoolsTrigger
        position={state.position}
        open={state.open}
        onToggle={toggleOpen}
        hasForcedRegion={forcedRegion !== undefined}
        panelId={PANEL_ID}
        onPositionChange={setPosition}
      />
      {state.open && data ? (
        <DevtoolsPanel
          panelId={PANEL_ID}
          activeTab={state.activeTab}
          onTabChange={setActiveTab}
          onClose={() => setOpen(false)}
          data={{
            ...data,
            region: {
              ...data.region,
              decision: previewDecision,
              forcedRegion,
              forcedRegionIgnored,
              drivingSignal: drivingSignalLabel,
            },
          }}
          manager={runtime?.manager}
          onForceRegion={setRegion}
          onClearRegionOverride={clearRegion}
          position={state.position}
          themeChoice={theme.choice}
          onThemeChange={theme.setTheme}
          runtime={runtime}
          onClearEvents={clearEvents}
        />
      ) : null}
    </div>
  );
}
