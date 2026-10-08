import type { Finding } from "./classify.js";

/** A copyable fix for one finding, plus a line saying what it does. */
export type Snippet = { title: string; code: string };

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "script"
  );
}

/**
 * The code that would bring a finding under the SDK's control: the matching
 * `@cookieyes/scripts` preset when there is one, else `customScript`,
 * `<GatedFrame>` or a network-blocker rule. Cookies and storage keys have no
 * snippet of their own: the fix is gating whatever sets them.
 */
export function snippetFor(finding: Finding): Snippet | undefined {
  if (finding.status === "managed" || finding.status === "necessary") return undefined;
  const category = finding.category ?? "analytics";
  const preset = finding.vendor?.preset;

  if (preset && finding.kind !== "cookie" && finding.kind !== "storage") {
    const fn = preset.slice(0, preset.indexOf("("));
    return {
      title: `Load ${finding.vendor?.name} through its @cookieyes/scripts preset`,
      code: `import { ${fn} } from "@cookieyes/scripts";\n\n// in your CookieYes config\nintegrations: [${preset}],`,
    };
  }
  if (finding.kind === "script") {
    const id = finding.vendor?.id ?? slug(finding.label);
    return {
      title: "Gate this script behind consent",
      code: `import { customScript } from "@cookieyes/scripts";\n\n// in your CookieYes config\nintegrations: [\n  customScript({\n    id: "${id}",\n    src: "${finding.url ?? finding.label}",\n    category: "${category}",\n  }),\n],`,
    };
  }
  if (finding.kind === "iframe") {
    return {
      title: "Replace the iframe with a gated one",
      code: `import { GatedFrame } from "@cookieyes/react";\n\n<GatedFrame src="${finding.url ?? finding.label}" category="${category}" />`,
    };
  }
  if (finding.kind === "request") {
    const [host = finding.label, segment] = finding.label.split("/");
    const id = finding.vendor?.id ?? slug(host);
    // Scoped to the path too, so blocking Google Ads pings on google.com
    // doesn't also block reCAPTCHA there.
    const path = segment ? `, pathIncludes: "/${segment}"` : "";
    return {
      title: "Block these requests until consent",
      code: `// in your CookieYes config\nnetworkBlocker: {\n  rules: [{ id: "${id}", domain: "${host}"${path}, category: "${category}" }],\n},`,
    };
  }
  return undefined;
}
