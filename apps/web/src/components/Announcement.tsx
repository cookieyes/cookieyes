import { getAnnouncement } from "@/lib/announcement";
import { announcementGateScript } from "@/lib/announcement-gate.mjs";
import { PLAYGROUND_PREVIEW_PATH, TRACKING_ENABLED } from "@/lib/site";
import { AnnouncementBar } from "./AnnouncementBar";

/**
 * Sets the strip's height for the sticky headers below it as soon as it is parsed, before
 * React loads: a page restored mid-scroll would otherwise draw the header under the strip.
 */
const MEASURE = `document.documentElement.style.setProperty("--cy-ann-h", document.getElementById("cy-ann").offsetHeight + "px");`;

/**
 * The before-paint check, for <head>. Only builds with the CookieYes banner wait for a
 * consent choice; without one there is nothing to wait for.
 */
export function AnnouncementGate() {
  const announcement = getAnnouncement();
  if (!announcement) return null;
  const script = announcementGateScript({
    id: announcement.id,
    expiresAt: announcement.expiresAt,
    linkPath: announcement.linkPath,
    skipPath: PLAYGROUND_PREVIEW_PATH,
    waitForConsent: TRACKING_ENABLED,
  });
  // biome-ignore lint/security/noDangerouslySetInnerHtml: built from the checked announcement file, not user input.
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

/** The strip, first in <body> after the skip link. Renders nothing without an announcement. */
export function AnnouncementStrip() {
  const announcement = getAnnouncement();
  if (!announcement) return null;
  return (
    <>
      <AnnouncementBar announcement={announcement} />
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: a fixed inline snippet, not user input. */}
      <script dangerouslySetInnerHTML={{ __html: MEASURE }} />
    </>
  );
}
