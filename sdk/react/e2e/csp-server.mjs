import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Serves the built e2e fixture with a real, strict CSP header — the same
// header a security-conscious customer's site would send — so the browser
// genuinely enforces it, not a simulation. `style-src 'self'` with no
// `unsafe-inline` and no nonce is the exact policy documented in the README.
const ROOT = join(fileURLToPath(import.meta.url), "..", "fixture-dist");
const CSP = "default-src 'self'; style-src 'self'; script-src 'self' 'unsafe-inline'";

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

const PORT = Number(process.env.CSP_FIXTURE_PORT ?? 5391);

createServer(async (req, res) => {
  const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
  const path = pathname === "/" ? "/index.html" : pathname;
  try {
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, {
      "content-type": MIME[extname(path)] ?? "application/octet-stream",
      "content-security-policy": CSP,
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}).listen(PORT, () => {
  console.log(`csp fixture server on http://localhost:${PORT}`);
});
