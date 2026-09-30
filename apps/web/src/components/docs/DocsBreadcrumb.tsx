import Link from "next/link";
import { Fragment, type ReactNode } from "react";

export type Crumb = { name: ReactNode; url?: string | undefined };

/**
 * The trail above a docs page's h1. Drawn here rather than by Fumadocs' breadcrumb slot so
 * a framework page's trail can start with its framework ("Next.js › Styling › CSP") on
 * every tab, including Integrations, whose root is its own tab. Same markup and classes
 * as Fumadocs' slot (fumadocs-ui layouts/notebook/page/slots/breadcrumb.js), so .cy-doc-bc
 * styles it unchanged.
 */
export function DocsBreadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="cy-doc-bc flex items-center gap-1.5 text-sm text-fd-muted-foreground"
    >
      {items.map((item, i) => {
        const last = i === items.length - 1;
        const className = last ? "truncate text-fd-primary font-medium" : "truncate";
        return (
          // The trail is rebuilt from scratch on each page, never reordered.
          // biome-ignore lint/suspicious/noArrayIndexKey: see above
          <Fragment key={i}>
            {i !== 0 && <ChevronIcon />}
            {item.url ? (
              <Link
                href={item.url}
                className={`${className} transition-opacity hover:opacity-80`}
                aria-current={last ? "page" : undefined}
              >
                {item.name}
              </Link>
            ) : (
              <span className={className}>{item.name}</span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="size-3.5 shrink-0"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
