"use client";

import { useEffect } from "react";
import { DesignMotion } from "./design-motion.js";

/** Height of the globe's mount point, cleared on teardown. */
const GLOBE_MOUNT_SELECTOR = "[data-globe-mount]";

/**
 * Starts the design's motion: the decorative canvases, the looping card demos, the
 * scroll reveals, the typing headline, and the WebGL globe.
 *
 * The motion code is imperative and finds its own elements by the data-attributes the
 * design puts on them, so this component only owns its lifetime — mount it once inside
 * the page wrapper.
 *
 * Renders nothing.
 */
export function LandingMotion() {
  useEffect(() => {
    const pageRoot = document.querySelector<HTMLElement>(".cy-page");
    if (!pageRoot) return;

    let motion: DesignMotion | null = null;
    try {
      motion = new DesignMotion(pageRoot);
      motion.componentDidMount();
    } catch (error) {
      // Decoration must never take the page down with it.
      console.error("[landing] motion failed to start", error);
    }

    return () => {
      try {
        motion?.componentWillUnmount();
      } catch {
        // Nothing useful to do while tearing down.
      }

      // The design's teardown stops its timers but leaves the globe in place, and the
      // globe builds asynchronously — a torn-down instance can still be awaiting its
      // import. Dropping the reference makes that late build bail, and emptying the node
      // stops a remount stacking a second WebGL context.
      if (motion) motion._globeMount = null;
      const globeMount = pageRoot.querySelector(GLOBE_MOUNT_SELECTOR);
      if (globeMount) globeMount.innerHTML = "";
    };
  }, []);

  return null;
}
