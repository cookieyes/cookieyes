"use client";

import { useEffect } from "react";

/**
 * Moves focus to the page's heading once it mounts.
 *
 * Reaching a 404 through a client-side link replaces the content without moving focus, so
 * a screen-reader user is left on a link that no longer exists and hears nothing change.
 * Focusing the heading makes the arrival audible, and works the same on a direct load.
 */
export function NotFoundFocus({ headingId }: { headingId: string }) {
  useEffect(() => {
    document.getElementById(headingId)?.focus();
  }, [headingId]);

  return null;
}
