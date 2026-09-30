"use client";

/** 16×16 stroke icons (lucide-style paths), drawn with presentation attributes only. */
const PATHS = {
  consent:
    "M8 1.8 2.8 3.9v3.6c0 3.2 2.2 5.6 5.2 6.7 3-1.1 5.2-3.5 5.2-6.7V3.9L8 1.8zM5.6 8l1.7 1.7 3.1-3.3",
  integrations: "M6 2.5v2M10 2.5v2M4.5 4.5h7v3a3.5 3.5 0 0 1-7 0v-3zM8 11v2.5",
  blocked: "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM3.8 3.8l8.4 8.4",
  gcm: "M13.4 6.7H8.2v2.6h3a3.3 3.3 0 1 1-.9-3.6l1.8-1.8A5.9 5.9 0 1 0 13.9 8c0-.4 0-.9-.1-1.3z",
  events: "M14 8h-2.4l-1.8 5.2L6.2 2.8 4.4 8H2",
  region:
    "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM2 8h12M8 2c1.6 1.7 2.4 3.7 2.4 6S9.6 12.3 8 14c-1.6-1.7-2.4-3.7-2.4-6S6.4 3.7 8 2z",
  actions: "M8.7 1.8 3 9h4.4l-.7 5.2L12.4 7H8l.7-5.2z",
  copy: "M5.5 5.5V3.3c0-.4.4-.8.8-.8h6.4c.4 0 .8.4.8.8v6.4c0 .4-.4.8-.8.8h-2.2M3.3 5.5h6.4c.4 0 .8.4.8.8v6.4c0 .4-.4.8-.8.8H3.3a.8.8 0 0 1-.8-.8V6.3c0-.4.4-.8.8-.8z",
  download: "M8 2.5v8M4.8 7.5 8 10.7l3.2-3.2M2.8 13.5h10.4",
  banner: "M2.5 3.5h11v9h-11zM2.5 9.5h11M5 11h3",
  sliders: "M3 4.5h6M12 4.5h1M3 11.5h1M7 11.5h6M10.5 3v3M5.5 10v3",
  optout: "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM5.5 8h5",
  reset: "M2.8 8a5.2 5.2 0 1 0 1.6-3.8L2.8 5.8M2.8 2.8v3h3",
  trash:
    "M2.8 4.5h10.4M6.2 4.5V3.1c0-.3.3-.6.6-.6h2.4c.3 0 .6.3.6.6v1.4M4.2 4.5l.6 8.4c0 .4.4.6.7.6h5c.4 0 .7-.3.7-.6l.6-8.4",
  search: "M7.2 12.4A5.2 5.2 0 1 0 7.2 2a5.2 5.2 0 0 0 0 10.4zM13.8 13.8l-3-3",
  close: "M4 4l8 8M12 4l-8 8",
  lock: "M4.5 7.2h7c.4 0 .7.3.7.7v5c0 .4-.3.6-.7.6h-7a.7.7 0 0 1-.7-.6v-5c0-.4.3-.7.7-.7zM5.8 7.2V5.1a2.2 2.2 0 1 1 4.4 0v2.1",
  system: "M2.5 3.5h11v7h-11zM6 13.5h4M8 10.5v3",
  light:
    "M8 5.25a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5zM8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9",
  dark: "M13.5 9.6A5.5 5.5 0 0 1 6.4 2.5a5.5 5.5 0 1 0 7.1 7.1z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className }: { name: IconName; className?: string | undefined }) {
  return (
    <svg
      className={className ? `cyd-icon ${className}` : "cyd-icon"}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
