"use client";

export type CookieYesMarkProps = {
  className?: string | undefined;
  /** Draw the round light backdrop the brand icon sits on (the trigger); off for the panel header. */
  withBackdrop?: boolean | undefined;
};

/**
 * The CookieYes logo mark, drawn from the docs site's `apps/web/src/app/icon.svg`
 * (copied, not imported — this package never depends on apps/web). Inline SVG
 * with presentation attributes only, so it needs no stylesheet or `style=`.
 */
export function CookieYesMark({ className, withBackdrop = false }: CookieYesMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      {withBackdrop ? <circle cx="32" cy="32" r="32" fill="#FBFBFB" /> : null}
      <path d="M26.7881 24.1575H17.7407L26.0126 39.6669H35.0601L26.7881 24.1575Z" fill="#0056A7" />
      <path
        d="M25.8376 39.231L26.0961 39.6666H35.1436L29.1981 28.7751L25.8376 39.231Z"
        fill="#2E3191"
      />
      <path d="M42.3854 11.0876L26.1001 39.6669H35.1475L51.4329 11.0876H42.3854Z" fill="#0056A7" />
      <path d="M26.1001 43.936H34.889V52.9106H26.1001V43.936Z" fill="#0056A7" />
    </svg>
  );
}
