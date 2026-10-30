import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";

/**
 * Wrap the backend's handler for Node's own request and response objects: `node:http`,
 * Express, Connect, and Fastify's raw request. The body is streamed through unread,
 * so mount it before any body parser such as `express.json()`.
 *
 * @example
 * app.use("/api/consent", toNodeHandler(backend.handler));
 */
export function toNodeHandler(
  handler: (request: Request) => Promise<Response>,
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  return async (req, res) => {
    // Express strips its mount path from `url` and keeps the full path in `originalUrl`.
    const path = (req as IncomingMessage & { originalUrl?: string }).originalUrl ?? req.url ?? "/";
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      for (const item of Array.isArray(value) ? value : [value]) headers.append(name, item);
    }
    const method = req.method ?? "GET";
    const hasBody = method !== "GET" && method !== "HEAD";
    const request = new Request(new URL(path, `http://${req.headers.host ?? "localhost"}`), {
      method,
      headers,
      ...(hasBody
        ? { body: Readable.toWeb(req) as ReadableStream<Uint8Array>, duplex: "half" }
        : {}),
    } as RequestInit);
    const response = await handler(request);
    res.statusCode = response.status;
    for (const [name, value] of response.headers) res.setHeader(name, value);
    res.end(Buffer.from(await response.arrayBuffer()));
  };
}
