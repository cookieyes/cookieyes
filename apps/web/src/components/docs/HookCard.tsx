import type { ReactNode } from "react";

interface HookCardProps {
  /** The hook's call signature, e.g. `useConsent()`. Rendered mono. */
  name: string;
  /** Return type, shown right-aligned in the header. */
  returns?: string | undefined;
  /** Package the hook ships from, e.g. `@cookieyes/react`. */
  pkg?: string | undefined;
  children: ReactNode;
}

/**
 * Reference card for a single hook — mono name on the left, return type on the
 * right, prose body beneath. The docs design uses one per hook on the Hooks pages.
 */
export function HookCard({ name, returns, pkg, children }: HookCardProps) {
  return (
    <div className="cy-doc-hook">
      <div className="cy-doc-hook-head">
        <span className="cy-doc-hook-name">{name}</span>
        {pkg ? <span className="cy-doc-pkg">{pkg}</span> : null}
        {returns ? <span className="cy-doc-hook-returns">→ {returns}</span> : null}
      </div>
      <div className="cy-doc-hook-body">{children}</div>
    </div>
  );
}
