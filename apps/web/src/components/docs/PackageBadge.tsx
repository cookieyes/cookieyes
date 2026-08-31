type PackageKey = "core" | "react" | "nextjs" | "cli" | "translations";

/** Initial shown in the colour chip — mirrors the sidebar package switcher. */
const PACKAGE_MARK: Record<PackageKey, string> = {
  core: "C",
  react: "R",
  nextjs: "N",
  cli: "✦",
  translations: "T",
};

/**
 * Inline chip naming the package an API ships from, e.g. next to a hook in a table
 * or a heading. `of` keys the colour and initial; the printed name is the full
 * scoped package so it stays copy-pasteable.
 */
export function PackageBadge({ of }: { of: PackageKey }) {
  return (
    <span className="cy-doc-pkg">
      <span className="cy-doc-pkg-mark" data-pkg={of} aria-hidden="true">
        {PACKAGE_MARK[of]}
      </span>
      @cookieyes/{of}
    </span>
  );
}
