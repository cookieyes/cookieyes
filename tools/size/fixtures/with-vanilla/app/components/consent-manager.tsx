"use client";

/*
 * @cookieyes/vanilla on a page with no framework of its own: the Next.js app is
 * only the control every fixture shares, so the figure is vanilla's cost over an
 * empty app, measured the same way as the React ones. `start` draws the banner
 * and the recall button; the dialogs load when a visitor first opens one, so
 * they count in `total` and not in `initial`.
 */

import { start } from "@cookieyes/vanilla";
import { useEffect } from "react";

export function CookieYesRoot() {
  useEffect(() => {
    start({ mode: "cookie-only", regulation: "GDPR" });
  }, []);

  return null;
}
