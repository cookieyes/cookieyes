import { CONTRACT_VERSION, MAX_BODY_BYTES, PAYLOAD_FIELDS, RECORD_FIELDS } from "./contract.js";
import { BACKEND_VERSION } from "./version.js";

const html = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Escapes the text, then turns the source prose's `backtick` spans into code. */
const prose = (text: string) => html(text).replace(/`([^`]+)`/g, "<code>$1</code>");

type Operation = { summary?: string; description?: string; security?: unknown[] };

const PERSONAL_LABEL: Record<string, string> = {
  no: "No",
  pseudonymous: "Pseudonymous",
  "coarse location": "Coarse location",
  yes: "Yes",
};

const personal = (value: string) =>
  `<span class="tag ${value === "no" ? "" : "tag-warn"}">${html(PERSONAL_LABEL[value] ?? value)}</span>`;

// Contrast: every text/background pair below is at least 4.5:1 in both schemes, and
// secondary text uses a muted colour, never opacity, so it stays legible on any ground.
const STYLE = `
:root{color-scheme:light;--bg:#fff;--surface:#f6f7f9;--ink:#14181f;--muted:#4a5361;--line:#dfe3e8;
--accent:#0b5cad;--code:#eef1f5;--get:#0a6b3d;--get-bg:#e3f4ea;--post:#0b5cad;--post-bg:#e2eefb;
--del:#a3261b;--del-bg:#fbe7e5;--warn:#7a4b00;--warn-bg:#fdf0d5;--owner:#5b2d9e;--owner-bg:#efe7fb}
@media (prefers-color-scheme:dark){:root{color-scheme:dark;--bg:#111418;--surface:#1a1f26;--ink:#e8ecf1;
--muted:#a9b3c1;--line:#2c333d;--accent:#7cb7ff;--code:#232a33;--get:#7ee2a8;--get-bg:#123222;
--post:#8cc4ff;--post-bg:#132a45;--del:#ff9d93;--del-bg:#3b1a17;--warn:#f5c46b;--warn-bg:#3a2c10;
--owner:#cdb2ff;--owner-bg:#2b1f45}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:68rem;margin:0 auto;padding:2.5rem 1rem 4rem}
h1{font-size:2rem;line-height:1.2;margin:0 0 .5rem}
h2{font-size:1.35rem;margin:2.5rem 0 .25rem}
p{margin:.25rem 0 1rem;max-width:70ch}
.lede{color:var(--muted)}
a{color:var(--accent);text-underline-offset:2px}
a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.meta{display:flex;flex-wrap:wrap;gap:.5rem;margin:1rem 0 0}
.chip{border:1px solid var(--line);border-radius:999px;padding:.15rem .7rem;font-size:.85rem;color:var(--muted)}
.chip b{color:var(--ink);font-weight:600}
.wrap{overflow-x:auto;border:1px solid var(--line);border-radius:10px;margin:1rem 0}
table{border-collapse:collapse;width:100%;font-size:.95rem}
th,td{text-align:left;vertical-align:top;padding:.7rem .85rem;border-bottom:1px solid var(--line)}
tr:last-child td{border-bottom:0}
th{background:var(--surface);font-size:.78rem;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);white-space:nowrap}
code{font:.88em/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--code);border-radius:4px;padding:.1em .35em;color:var(--ink)}
.route{white-space:nowrap}
.route code{background:none;padding:0}
.method{display:inline-block;min-width:4.2rem;font:600 .75rem/1.6 ui-monospace,Menlo,monospace;border-radius:4px;padding:0 .4rem;margin-right:.4rem;text-align:center}
.m-get{color:var(--get);background:var(--get-bg)}.m-post{color:var(--post);background:var(--post-bg)}.m-delete{color:var(--del);background:var(--del-bg)}
.tag{display:inline-block;font-size:.8rem;font-weight:600;border-radius:999px;padding:0 .55rem;white-space:nowrap;background:var(--surface);color:var(--muted);border:1px solid var(--line)}
.tag-warn{background:var(--warn-bg);color:var(--warn);border-color:transparent}
.tag-owner{background:var(--owner-bg);color:var(--owner);border-color:transparent}
.summary{font-weight:600}
.detail{color:var(--muted);margin-top:.15rem}
.values{margin-top:.35rem;display:flex;flex-wrap:wrap;gap:.3rem}
`;

/**
 * The contract as one self-contained page. No script and nothing from another host:
 * a consent server should not load third-party code to describe itself.
 */
export function renderDocsPage(openapi: Record<string, unknown>, basePath: string): string {
  const paths = openapi.paths as Record<string, Record<string, Operation>>;
  const routes = Object.entries(paths)
    .flatMap(([path, methods]) =>
      Object.entries(methods).map(([method, op]) => {
        const full = basePath + (path === "/" ? "" : path) || "/";
        const access = op.security
          ? '<span class="tag tag-owner">Owner key</span>'
          : '<span class="tag">Public</span>';
        const detail = op.description ? `<div class="detail">${prose(op.description)}</div>` : "";
        return `<tr><td class="route"><span class="method m-${method}">${method.toUpperCase()}</span><code>${html(full)}</code></td><td>${access}</td><td><div class="summary">${html(op.summary ?? "")}</div>${detail}</td></tr>`;
      }),
    )
    .join("");
  const payload = PAYLOAD_FIELDS.map((f) => {
    const values = f.enum
      ? `<div class="values">${f.enum.map((v) => `<code>${html(v)}</code>`).join("")}</div>`
      : "";
    return `<tr><td><code>${f.name}</code></td><td>${f.required ? "Required" : "Optional"}</td><td>${personal(f.personalData)}</td><td>${prose(f.description)}${values}</td></tr>`;
  }).join("");
  const stored = RECORD_FIELDS.map(
    (f) =>
      `<tr><td><code>${f.column}</code></td><td>${personal(f.personalData)}</td><td>${prose(f.description)}</td></tr>`,
  ).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Consent backend API</title>
<style>${STYLE}</style></head><body><main>
<h1>Consent backend API</h1>
<p class="lede">Where the CookieYes SDK sends each consent decision in self-hosted mode, and what this server keeps.</p>
<div class="meta"><span class="chip">Contract <b>${CONTRACT_VERSION}</b></span><span class="chip">Server <b>${html(BACKEND_VERSION)}</b></span><span class="chip">Body limit <b>${MAX_BODY_BYTES / 1024} KB</b></span><a class="chip" href="${html(basePath)}/openapi.json">openapi.json</a><a class="chip" href="${html(basePath)}/status">status</a></div>
<h2>Endpoints</h2>
<p>Owner routes need <code>Authorization: Bearer &lt;key&gt;</code> with one of the server's <code>apiKeys</code>. Never send that key from a browser.</p>
<div class="wrap"><table><thead><tr><th>Route</th><th>Access</th><th>What it does</th></tr></thead><tbody>${routes}</tbody></table></div>
<h2>What the SDK sends</h2>
<p>The JSON body of each save. Fields this server does not know are ignored and never stored.</p>
<div class="wrap"><table><thead><tr><th>Field</th><th></th><th>Personal data</th><th>Meaning</th></tr></thead><tbody>${payload}</tbody></table></div>
<h2>What is stored</h2>
<p>One row per decision. A visitor who changes their mind adds a row; the latest is their current choice.</p>
<div class="wrap"><table><thead><tr><th>Column</th><th>Personal data</th><th>Meaning</th></tr></thead><tbody>${stored}</tbody></table></div>
</main></body></html>`;
}
